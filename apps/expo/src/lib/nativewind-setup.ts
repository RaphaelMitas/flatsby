import { Svg } from "react-native-svg";
import Icon from "@react-native-vector-icons/lucide";
import { cssInterop } from "nativewind";

// Configure cssInterop for SVG components to work with NativeWind
cssInterop(Svg, {
  className: {
    target: "style",
    nativeStyleToProp: {
      width: true,
      height: true,
      color: "fill",
    },
  },
});

cssInterop(Icon, {
  className: {
    target: "style",
    nativeStyleToProp: { height: "size", width: "size", color: "color" },
  },
});

// Note: Path, Circle, Rect etc. inherit styling from parent Svg component
// so we only need to configure the root Svg component
