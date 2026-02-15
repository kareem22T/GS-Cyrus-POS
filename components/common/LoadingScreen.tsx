import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type LoadingScreenProps = {
  message?: string;
};

export default function LoadingScreen({
  message = "Loading...",
}: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: "#444",
  },
});
