import { Link } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.subtitle}>Page Not Found</Text>
      <Text style={styles.description}>
        The page you&apos;re looking for doesn&apos;t exist.
      </Text>
      <Link href="/(protected)/(tabs)/pos" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
