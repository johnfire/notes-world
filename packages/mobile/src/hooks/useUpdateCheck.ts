import { useEffect, useState } from "react";
import { Linking } from "react-native";
import Constants from "expo-constants";

const BASE_URL = "https://notes-world.christopherrehm.de";
const CURRENT_VERSION_CODE: number =
  Constants.expoConfig?.extra?.versionCode ?? 1;

interface UpdateInfo {
  available: boolean;
  downloadUrl: string;
}

export function useUpdateCheck(): {
  update: UpdateInfo | null;
  dismiss: () => void;
  openDownload: () => void;
} {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/mobile/version`)
      .then((r) => r.json())
      .then((data: { versionCode: number; downloadUrl: string }) => {
        if (data.versionCode > CURRENT_VERSION_CODE) {
          setUpdate({
            available: true,
            downloadUrl: `${BASE_URL}${data.downloadUrl}`,
          });
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    setUpdate(null);
  }

  function openDownload() {
    if (update) {
      Linking.openURL(update.downloadUrl);
      setUpdate(null);
    }
  }

  return { update, dismiss, openDownload };
}
