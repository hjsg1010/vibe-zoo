import {
  commandSchema,
  receiptSchema,
  bindingSchema,
  type Binding,
} from "../shared/contracts.js";
import { assertTarget, nextBinding } from "./target.js";
let socket: WebSocket | undefined;
let binding: Binding | undefined;
let recordBinding: Binding | undefined;
chrome.storage.session
  .setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
  .catch(() => undefined);
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch(() => undefined);
chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) {
    void chrome.sidePanel.open({ tabId: tab.id });
    void chrome.storage.session.set({ selectedTab: tab.id });
  }
});
async function connect(
  tabId: number,
  origin: string,
  token: string,
): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url || !/^https?:/.test(tab.url)) throw Error("unsupported_page");
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
  const frames = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({ origin: location.origin, path: location.pathname }),
  });
  const frame = frames[0];
  if (!frame?.documentId || !frame.result) throw Error("target_changed");
  const initialCheckpoint = frame.result;
  const saved = await chrome.storage.local.get("instance");
  const instance =
    typeof saved.instance === "string" ? saved.instance : crypto.randomUUID();
  await chrome.storage.local.set({ instance });
  await chrome.storage.session.set({
    instance,
    token,
    backendOrigin: origin,
    selectedTab: tabId,
  });
  socket?.close();
  let resolveBound!: () => void;
  let rejectBound!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveBound = resolve;
    rejectBound = reject;
  });
  const ws = new WebSocket(origin.replace(/^https:/, "wss:") + "/bridge");
  socket = ws;
  const timeout = setTimeout(() => {
    rejectBound(Error("bridge_connection_failed"));
    ws.close();
  }, 8000);
  ws.onopen = () =>
    ws.send(
      JSON.stringify({
        type: "hello",
        token,
        binding: {
          instance,
          tabId,
          documentId: frame.documentId,
          origin: initialCheckpoint.origin,
          path: initialCheckpoint.path,
        },
      }),
    );
  ws.onmessage = (event) => {
    void (async () => {
      const raw: unknown = JSON.parse(String(event.data));
      if (
        typeof raw === "object" &&
        raw !== null &&
        "type" in raw &&
        raw.type === "heartbeat"
      ) {
        ws.send(JSON.stringify({ type: "heartbeat" }));
        return;
      }
      if (
        typeof raw === "object" &&
        raw !== null &&
        "type" in raw &&
        raw.type === "bound" &&
        "binding" in raw
      ) {
        binding = bindingSchema.parse(raw.binding);
        await chrome.storage.session.set({ binding });
        clearTimeout(timeout);
        resolveBound();
        return;
      }
      const command = commandSchema.parse(raw);
      if (!binding) throw Error("disconnected");
      assertTarget(command, binding);
      const checkpoint = async () => {
        const frames = await chrome.scripting.executeScript({
          target: { tabId: command.binding.tabId },
          func: () => ({
            origin: location.origin,
            path: location.pathname,
            href: location.href,
            ready: document.readyState,
          }),
        });
        const frame = frames[0];
        if (!frame?.documentId || !frame.result) throw Error("target_changed");
        return { documentId: frame.documentId, ...frame.result };
      };
      const before = await checkpoint();
      if (
        before.documentId !== binding.documentId ||
        before.origin !== binding.origin ||
        before.path !== binding.path
      )
        throw Error("target_changed");
      const key = `action:${command.actionId}`;
      if ((await chrome.storage.session.get(key))[key])
        throw Error("duplicate_action");
      await chrome.storage.session.set({ [key]: "started" });
      const navigationUrl =
        command.operation.kind === "navigate"
          ? new URL(command.operation.path, before.origin).href
          : undefined;
      const awaitNavigation = async () => {
        const deadline = Math.min(command.expiresAt, Date.now() + 8000);
        while (Date.now() < deadline) {
          try {
            const current = await checkpoint();
            if (current.origin !== before.origin) throw Error("target_changed");
            if (
              (!navigationUrl || current.href === navigationUrl) &&
              current.ready !== "loading" &&
              (!navigationUrl ||
                navigationUrl === before.href ||
                current.documentId !== before.documentId)
            )
              return current;
          } catch (error) {
            if (error instanceof Error && error.message === "target_changed")
              throw error;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        throw Error("target_changed");
      };
      const observeDocument = async (documentId: string) => {
        await chrome.scripting.executeScript({
          target: { tabId: command.binding.tabId, documentIds: [documentId] },
          files: ["content.js"],
        });
        return chrome.tabs.sendMessage(
          command.binding.tabId,
          { ...command, operation: { kind: "observe" } },
          { documentId },
        );
      };
      let outcome: unknown;
      try {
        outcome = await chrome.tabs.sendMessage(binding.tabId, command, {
          documentId: binding.documentId,
        });
      } catch (error) {
        if (
          command.operation.kind !== "click" &&
          command.operation.kind !== "navigate"
        )
          throw error;
        // A document transition loses the content response. Observe only; never replay the action.
        await new Promise((r) => setTimeout(r, 300));
        const after = await awaitNavigation();
        if (after.origin !== binding.origin)
          throw Error("target_changed", { cause: error });
        outcome = await observeDocument(after.documentId);
      }
      const after = navigationUrl
        ? await awaitNavigation()
        : await checkpoint();
      if (after.documentId !== before.documentId)
        outcome = await observeDocument(after.documentId);
      const next = nextBinding(command, after);
      const receipt = receiptSchema.parse({
        type: "receipt",
        actionId: command.actionId,
        jobId: command.jobId,
        controlRevision: command.controlRevision,
        binding: command.binding,
        nextBinding: next,
        outcome,
      });
      if (next) {
        binding = next;
        await chrome.storage.session.set({ binding });
      }
      await chrome.storage.session.set({ [key]: "finished" });
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(receipt));
    })().catch(() => {
      ws.close();
    });
  };
  ws.onerror = () => {
    clearTimeout(timeout);
    rejectBound(Error("bridge_connection_failed"));
  };
  ws.onclose = () => {
    clearTimeout(timeout);
    rejectBound(Error("bridge_connection_failed"));
    if (socket === ws) {
      if (recordBinding) {
        void chrome.tabs
          .sendMessage(
            recordBinding.tabId,
            { type: "record_clear" },
            { documentId: recordBinding.documentId },
          )
          .catch(() => undefined);
        recordBinding = undefined;
      }
      binding = undefined;
      void chrome.storage.session.remove("binding");
    }
  };
  await ready;
}
chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    sender.url !== chrome.runtime.getURL("panel/index.html")
  )
    return false;
  if (typeof message !== "object" || !message || !("type" in message))
    return false;
  if (
    ["record_start", "record_stop", "record_clear"].includes(
      String(message.type),
    )
  ) {
    void (async () => {
      if (message.type === "record_clear") {
        const target = recordBinding ?? binding;
        recordBinding = undefined;
        if (target)
          await chrome.tabs
            .sendMessage(
              target.tabId,
              { type: "record_clear" },
              { documentId: target.documentId },
            )
            .catch(() => undefined);
        return { ok: true };
      }
      if (!binding) throw Error("disconnected");
      if (message.type === "record_start") {
        if (recordBinding) throw Error("conflict");
        recordBinding = { ...binding };
      }
      const target = recordBinding ?? binding;
      const response = await chrome.tabs.sendMessage(
        target.tabId,
        { type: message.type },
        { documentId: target.documentId },
      );
      if (!response?.ok) throw Error("recording_incomplete");
      if (message.type === "record_stop") {
        const saved = await chrome.storage.session.get([
          "backendOrigin",
          "token",
        ]);
        // Re-observe the same user's tab at Stop. Backend verifies the record lease before accepting a changed path.
        await connect(
          target.tabId,
          String(saved.backendOrigin),
          String(saved.token),
        );
      }
      if (message.type === "record_clear") recordBinding = undefined;
      return response;
    })().then(respond, () =>
      respond({ ok: false, error: "recording_incomplete" }),
    );
    return true;
  }
  if (
    message.type === "connect" &&
    "tabId" in message &&
    "origin" in message &&
    "token" in message
  ) {
    void connect(
      Number(message.tabId),
      String(message.origin),
      String(message.token),
    ).then(
      () => respond({ ok: true }),
      (error) =>
        respond({
          ok: false,
          error:
            error instanceof Error &&
            [
              "unsupported_page",
              "target_changed",
              "bridge_connection_failed",
            ].includes(error.message)
              ? error.message
              : "bridge_connection_failed",
        }),
    );
    return true;
  }
  return false;
});
chrome.tabs.onRemoved.addListener((tabId) => {
  if (binding?.tabId === tabId) socket?.close();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (recordBinding && tabId !== recordBinding.tabId) {
    void chrome.tabs
      .sendMessage(
        recordBinding.tabId,
        { type: "record_clear" },
        { documentId: recordBinding.documentId },
      )
      .catch(() => undefined);
    recordBinding = undefined;
  }
});
