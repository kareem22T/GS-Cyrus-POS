import React, { ReactNode } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong 😢</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "Unexpected error"}
          </Text>
          <Button title="Try Again" onPress={this.resetError} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  message: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
});
