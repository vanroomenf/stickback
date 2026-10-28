// Push notifications: "@luca replied to you" even when the app is closed.
// The server sends them (supabase/functions/moderate) to the Expo push tokens saved in push_tokens.
// Works on a real phone with an EAS project id (app.json → extra.eas.projectId). In Expo Go only iPhone
// gets them; Android needs the installable version of the app.
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

const projectId = () => Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
export const pushAvailable = () => Platform.OS !== "web" && Device.isDevice && !!projectId();

if (Platform.OS !== "web") {
  // With the app open, new replies already show up on screen: keep the notification in the list only
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function pushPermission() {
  if (!pushAvailable()) return "unavailable";
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : canAskAgain ? "ask" : "denied";
}

// ask: show the system question if needed. Returns the Expo push token, or null.
export async function getPushToken({ ask }) {
  if (!pushAvailable()) return null;
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && ask) ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Stickback", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  return data;
}

// Calls onOpen({ pid, mid }) when someone taps a notification, also when it started the app
export function onNotificationOpen(onOpen) {
  if (Platform.OS === "web") return () => {};
  const open = (response) => {
    const data = response?.notification?.request?.content?.data;
    if (data?.pid) onOpen({ pid: Number(data.pid), mid: data.mid ? Number(data.mid) : null });
  };
  Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
