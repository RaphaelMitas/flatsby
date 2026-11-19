import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "jpeg-js";
import jsQR from "jsqr";

const MAX_EDGE = 1000;

export async function qrTextFromPicture(uri: string) {
  const image = await ImageManipulator.manipulate(uri, {
    maxWidth: MAX_EDGE,
    maxHeight: MAX_EDGE,
  }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG });
  const { data, width, height } = decode(await new File(saved.uri).bytes(), {
    useTArray: true,
    formatAsRGBA: true,
  });
  const pixels = new Uint8ClampedArray(
    data.buffer,
    data.byteOffset,
    data.length,
  );
  return jsQR(pixels, width, height)?.data;
}
