import type * as React from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Pressable } from "react-native";

interface CenteredModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function CenteredModal({
  visible,
  onClose,
  children,
}: CenteredModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 items-center justify-center bg-black/50"
      >
        <Pressable
          accessible={false}
          onPress={onClose}
          className="absolute inset-0"
        />
        <Pressable
          accessible={false}
          onPress={Keyboard.dismiss}
          className="bg-background mx-4 w-full max-w-sm rounded-lg p-6 shadow-lg"
        >
          {children}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
