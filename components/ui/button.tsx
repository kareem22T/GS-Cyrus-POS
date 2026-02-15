import { Colors } from "@/constants/theme";
import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "./themed-text";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
  style?: any;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "outline" ? styles.outlineButton : styles.primaryButton,
        (disabled || loading) && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? Colors.light.tabIconSelected : "#fff"}
        />
      ) : (
        <ThemedText
          style={[
            styles.buttonText,
            variant === "outline"
              ? styles.outlineButtonText
              : styles.primaryButtonText,
          ]}
        >
          {title}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  primaryButton: {
    backgroundColor: Colors.light.tabIconSelected,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: Colors.light.tabIconSelected,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#fff",
  },
  outlineButtonText: {
    color: Colors.light.tabIconSelected,
  },
});
