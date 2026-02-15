import { Colors } from "@/constants/theme";
import { useFonts } from "expo-font";
import { StyleSheet, Text, type TextProps } from "react-native";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const [fontsLoaded] = useFonts({
    "Cairo-Regular": require("@/assets/fonts/Cairo-Regular.ttf"),
    "Cairo-SemiBold": require("@/assets/fonts/Cairo-SemiBold.ttf"),
    "Cairo-Bold": require("@/assets/fonts/Cairo-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Text
      style={[
        { color: Colors.light.text },
        styles.base,
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: "Cairo-Regular",
  },
  default: {
    fontSize: 12,
    lineHeight: 24,
    fontFamily: "Cairo-Regular",
  },
  defaultSemiBold: {
    fontSize: 12,
    lineHeight: 24,
    fontFamily: "Cairo-SemiBold",
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Cairo-Bold",
  },
  subtitle: {
    fontSize: 20,
    fontFamily: "Cairo-Bold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
    fontFamily: "Cairo-Regular",
  },
});
