import { Svg } from "react-native-svg";
import Icon from "@react-native-vector-icons/lucide";
import { styled } from "nativewind";

// Configure styled for SVG components to work with NativeWind
// In NativeWind v5, cssInterop is replaced with styled
export const StyledSvg = styled(Svg, {
  className: "style",
});

export const StyledIcon = styled(Icon, {
  className: "style",
});

// Note: Path, Circle, Rect etc. inherit styling from parent Svg component
// so we only need to configure the root Svg component
