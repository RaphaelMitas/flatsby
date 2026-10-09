import type { ComponentType, ReactElement, ReactNode } from "react";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControlProps,
} from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useState } from "react";
import { Platform, RefreshControl, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { RefreshSceneProps } from "~/lib/seasonal/season";
import { season } from "~/lib/seasonal/season";

const TRIGGER_DISTANCE = 80;
const HOLD_DISTANCE = 64;
const MAX_DISTANCE = 150;
// Under Android's 8dp touch slop, so the pull claims the touch before the list scrolls.
const ACTIVATION_DISTANCE = 4;

export interface ListRefreshProps {
  refreshControl?: ReactElement<RefreshControlProps>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}

interface PullToRefreshProps {
  refreshing: boolean;
  onRefresh: () => Promise<unknown>;
  children: (listProps: ListRefreshProps) => ReactNode;
}

interface ScenePullProps extends PullToRefreshProps {
  Scene: ComponentType<RefreshSceneProps>;
}

export function PullToRefresh(props: PullToRefreshProps) {
  const Scene = season.RefreshScene;

  if (!Scene) {
    return props.children({
      refreshControl: (
        <RefreshControl
          refreshing={props.refreshing}
          onRefresh={props.onRefresh}
        />
      ),
    });
  }

  return Platform.OS === "ios" ? (
    <BouncePull {...props} Scene={Scene} />
  ) : (
    <DragPull {...props} Scene={Scene} />
  );
}

function SceneBackdrop({
  Scene,
  reveal,
  refreshing,
}: {
  Scene: ComponentType<RefreshSceneProps>;
  reveal: SharedValue<number>;
  refreshing: boolean;
}) {
  const style = useAnimatedStyle(() => ({ height: reveal.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={style}
      className="absolute inset-x-0 top-0 overflow-hidden"
    >
      <Scene refreshing={refreshing} />
    </Animated.View>
  );
}

// iOS bounces past the top itself; the scene fills that gap behind a transparent native control.
function BouncePull({
  Scene,
  refreshing,
  onRefresh,
  children,
}: ScenePullProps) {
  const reveal = useSharedValue(0);

  return (
    <View className="flex-1">
      <SceneBackdrop Scene={Scene} reveal={reveal} refreshing={refreshing} />
      {children({
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
          />
        ),
        onScroll: (event) => {
          reveal.value = Math.max(0, -event.nativeEvent.contentOffset.y);
        },
        scrollEventThrottle: 16,
      })}
    </View>
  );
}

// Android lists don't overscroll, so the pull drags the list down itself.
function DragPull({ Scene, onRefresh, children }: ScenePullProps) {
  const reveal = useSharedValue(0);
  const atTop = useSharedValue(true);
  const touchStart = useSharedValue({ x: 0, y: 0 });
  const [pulled, setPulled] = useState(false);

  const refresh = () => {
    setPulled(true);
    void onRefresh().finally(() => {
      setPulled(false);
      reveal.value = withSpring(0);
    });
  };

  const pull = Gesture.Pan()
    .enabled(!pulled)
    .manualActivation(true)
    .onTouchesDown((event) => {
      const touch = event.allTouches[0];
      if (touch) touchStart.value = { x: touch.absoluteX, y: touch.absoluteY };
    })
    .onTouchesMove((event, manager) => {
      const touch = event.allTouches[0];
      if (!touch) return;
      const dx = touch.absoluteX - touchStart.value.x;
      const dy = touch.absoluteY - touchStart.value.y;
      // Horizontal drags belong to the row swipe actions, not the pull.
      if (
        !atTop.value ||
        dy < -ACTIVATION_DISTANCE ||
        (Math.abs(dx) > ACTIVATION_DISTANCE && Math.abs(dx) > Math.abs(dy))
      ) {
        manager.fail();
      } else if (dy > ACTIVATION_DISTANCE) {
        manager.activate();
      }
    })
    .onUpdate((event) => {
      reveal.value = Math.min(
        MAX_DISTANCE,
        Math.max(0, event.translationY * 0.5),
      );
    })
    .onEnd(() => {
      if (reveal.value >= TRIGGER_DISTANCE) {
        reveal.value = withSpring(HOLD_DISTANCE);
        scheduleOnRN(refresh);
      } else {
        reveal.value = withSpring(0);
      }
    });

  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reveal.value }],
  }));

  return (
    <View className="flex-1">
      <SceneBackdrop Scene={Scene} reveal={reveal} refreshing={pulled} />
      <GestureDetector gesture={pull}>
        <Animated.View style={listStyle} className="flex-1">
          {children({
            onScroll: (event) => {
              atTop.value = event.nativeEvent.contentOffset.y <= 0;
            },
            scrollEventThrottle: 16,
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
