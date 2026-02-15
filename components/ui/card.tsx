import React from "react";
import { StyleSheet } from "react-native";
import { ThemedView } from "./themed-view";

interface CardProps {
  children: React.ReactNode;
  style?: any;
}

export function Card({ children, style }: CardProps) {
  return <ThemedView style={[styles.card, style]}>{children}</ThemedView>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#00000072",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
