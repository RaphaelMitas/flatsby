import type {
  ComponentType,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";
import type { RefreshControlProps } from "react-native";
import type { DerivedValue } from "react-native-reanimated";
import { useCallback, useState } from "react";
import { Platform, RefreshControl, View } from "react-native";
import { Gesture, GestureDetector, State } from "react-native-gesture-handler";
import Animated, {
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useScrollOffset,
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

// Reanimated reads scroll offsets through getScrollableNode, which FlashList and ScrollView both expose.
interface Scrollable {
  getScrollableNode: () => unknown;
}

export interface ListRefreshProps {
  refreshControl?: ReactElement<RefreshControlProps>;
  ref?: (list: Scrollable | null) => void;
}

interface PullToRefreshProps {
  refreshing: boolean;
  onRefresh: () => Promise<unknown>;
  children: (listProps: ListRefreshProps) => ReactNode;
  parentPaddingX?: number;
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

// Native scroll events, so FlashList's filtered JS onScroll can't leave the offset stale.
function useListOffset() {
  const listRef = useAnimatedRef<ComponentType<RefAttributes<Scrollable>>>();
  const offset = useScrollOffset(listRef);
  const attachList = useCallback(
    (list: Scrollable | null) => {
      listRef(list);
    },
    [listRef],
  );
  return { attachList, offset };
}

// Only the user's own pull shows the scene; background refetches from sync stay invisible.
function useOwnRefresh(onRefresh: () => Promise<unknown>) {
  const [pulled, setPulled] = useState(false);
  const refresh = () => {
    setPulled(true);
    return onRefresh().finally(() => setPulled(false));
  };
  return { pulled, refresh };
}

function SceneBackdrop({
  Scene,
  reveal,
  refreshing,
  parentPaddingX = 0,
}: {
  Scene: ComponentType<RefreshSceneProps>;
  reveal: DerivedValue<number>;
  refreshing: boolean;
  parentPaddingX?: number;
}) {
  const [shown, setShown] = useState(false);

  useAnimatedReaction(
    () => reveal.value > 0,
    (visible, previous) => {
      if (visible !== previous) scheduleOnRN(setShown, visible);
    },
  );

  const style = useAnimatedStyle(() => ({ height: reveal.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ left: -parentPaddingX, right: -parentPaddingX }, style]}
      className="absolute top-0 overflow-hidden"
    >
      {shown && <Scene refreshing={refreshing} />}
    </Animated.View>
  );
}

// iOS bounces past the top itself; the scene fills that gap behind a transparent native control.
function BouncePull({
  Scene,
  onRefresh,
  children,
  parentPaddingX,
}: ScenePullProps) {
  const { attachList, offset } = useListOffset();
  const reveal = useDerivedValue(() => Math.max(0, -offset.value));
  const { pulled, refresh } = useOwnRefresh(onRefresh);

  return (
    <View className="flex-1">
      <SceneBackdrop
        Scene={Scene}
        reveal={reveal}
        refreshing={pulled}
        parentPaddingX={parentPaddingX}
      />
      {children({
        ref: attachList,
        refreshControl: (
          <RefreshControl
            refreshing={pulled}
            onRefresh={() => void refresh()}
            tintColor="transparent"
          />
        ),
      })}
    </View>
  );
}

// Android lists don't overscroll, so the pull drags the list down itself.
function DragPull({
  Scene,
  onRefresh,
  children,
  parentPaddingX,
}: ScenePullProps) {
  const { attachList, offset } = useListOffset();
  const reveal = useSharedValue(0);
  const touchStart = useSharedValue({ x: 0, y: 0 });
  const { pulled, refresh } = useOwnRefresh(onRefresh);

  const startRefresh = () => {
    void refresh().finally(() => {
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
      if (event.state === State.ACTIVE || !touch) return;
      const dx = touch.absoluteX - touchStart.value.x;
      const dy = touch.absoluteY - touchStart.value.y;
      // Horizontal drags belong to the row swipe actions, not the pull.
      if (
        offset.value > 0 ||
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
    .onEnd((_event, success) => {
      if (success && reveal.value >= TRIGGER_DISTANCE) {
        reveal.value = withSpring(HOLD_DISTANCE);
        scheduleOnRN(startRefresh);
      } else {
        reveal.value = withSpring(0);
      }
    });

  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reveal.value }],
  }));

  return (
    <View className="flex-1">
      <SceneBackdrop
        Scene={Scene}
        reveal={reveal}
        refreshing={pulled}
        parentPaddingX={parentPaddingX}
      />
      <GestureDetector gesture={pull}>
        <Animated.View style={listStyle} className="flex-1">
          {children({ ref: attachList })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
