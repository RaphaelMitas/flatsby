import type { ImagePickerOptions } from "expo-image-picker";
import * as ImagePicker from "expo-image-picker";

export type PictureSource = "camera" | "library";

const PICKER_OPTIONS: ImagePickerOptions = { mediaTypes: ["images"] };

export async function pickPicture(source: PictureSource) {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return "denied";
  }
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? undefined : result.assets[0];
}
