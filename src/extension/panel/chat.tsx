import { useState } from "react";
export function Chat({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.trim() || sending) return;
        setSending(true);
        void onSend(draft)
          .then(() => setDraft(""))
          .catch(() => undefined)
          .finally(() => setSending(false));
      }}
    >
      <label htmlFor="chat-input">Keeper에게 요청하기</label>
      <textarea
        id="chat-input"
        data-testid="chat-input"
        placeholder="이 페이지에서 어떤 일을 도와드릴까요?"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="row">
        <span className="hint">실제 변경 전 확인을 요청해요.</span>
        <button
          data-testid="send-chat"
          disabled={disabled || sending || !draft.trim()}
        >
          보내기 ↗
        </button>
      </div>
    </form>
  );
}
