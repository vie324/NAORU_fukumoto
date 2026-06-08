"use client";

/** server action を form action に取り、送信前に confirm するボタン。 */
export function DeleteButton({
  action,
  label = "削除",
  confirmText,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
  confirmText: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <button type="submit" className="btn-danger px-4 py-2 text-sm">
        {label}
      </button>
    </form>
  );
}
