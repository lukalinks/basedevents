"use client";

// Confirmation Modal Component
export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning" 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger";
}) {
  if (!isOpen) return null;

  const typeStyles = {
    warning: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      icon: "⚠️",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      confirmBtn: "bg-orange-600 hover:bg-orange-700"
    },
    danger: {
      bg: "bg-red-50",
      border: "border-red-200", 
      icon: "🗑️",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      confirmBtn: "bg-red-600 hover:bg-red-700"
    }
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-gray-200 animate-scale-in">
        <div className={`${styles.bg} ${styles.border} p-6 rounded-t-2xl border-b`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center text-xl`}>
              {styles.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2 text-white ${styles.confirmBtn} rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
