import type { UserWrappedSummary } from "@flatsby/api";
import { useCallback, useMemo } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ProgressDots } from "./ProgressDots";
import { SlideContainer } from "./SlideContainer";
import { CategoriesSlide } from "./slides/CategoriesSlide";
import { EngagementSlide } from "./slides/EngagementSlide";
import { GroupsSlide } from "./slides/GroupsSlide";
import { ItemsSlide } from "./slides/ItemsSlide";
import { ListsSlide } from "./slides/ListsSlide";
import { SummarySlide } from "./slides/SummarySlide";
import { WelcomeSlide } from "./slides/WelcomeSlide";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

interface WrappedExperienceProps {
  summary: UserWrappedSummary;
  onClose: () => void;
}

export function WrappedExperience({
  summary,
  onClose,
}: WrappedExperienceProps) {
  const currentIndex = useSharedValue(0);
  const translateX = useSharedValue(0);

  const slides = useMemo(
    () => [
      {
        id: "welcome",
        component: <WelcomeSlide summary={summary} />,
      },
      {
        id: "engagement",
        component: <EngagementSlide summary={summary} />,
      },
      {
        id: "groups",
        component: <GroupsSlide summary={summary} />,
      },
      {
        id: "lists",
        component: <ListsSlide summary={summary} />,
      },
      {
        id: "items",
        component: <ItemsSlide summary={summary} />,
      },
      {
        id: "categories",
        component: <CategoriesSlide summary={summary} />,
      },
      {
        id: "summary",
        component: <SummarySlide summary={summary} />,
      },
    ],
    [summary],
  );

  const goToSlide = useCallback(
    (index: number) => {
      "worklet";
      const clampedIndex = Math.max(0, Math.min(index, slides.length - 1));
      currentIndex.value = clampedIndex;
      translateX.value = withSpring(-clampedIndex * SCREEN_WIDTH, {
        damping: 20,
        stiffness: 200,
      });
    },
    [currentIndex, translateX, slides.length],
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newTranslateX =
        -currentIndex.value * SCREEN_WIDTH + event.translationX;
      // Clamp to prevent over-scrolling
      const minTranslate = -(slides.length - 1) * SCREEN_WIDTH;
      translateX.value = Math.max(minTranslate, Math.min(0, newTranslateX));
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const translation = event.translationX;

      let targetIndex = currentIndex.value;

      if (Math.abs(translation) > SWIPE_THRESHOLD || Math.abs(velocity) > 500) {
        if (translation > 0 || velocity > 500) {
          targetIndex = Math.max(0, currentIndex.value - 1);
        } else {
          targetIndex = Math.min(slides.length - 1, currentIndex.value + 1);
        }
      }

      goToSlide(targetIndex);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleDotPress = useCallback(
    (index: number) => {
      goToSlide(index);
    },
    [goToSlide],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#09090b", // zinc-950
        paddingTop: STATUS_BAR_HEIGHT,
        height: SCREEN_HEIGHT,
      }}
    >
      {/* Close button */}
      <View
        style={{
          position: "absolute",
          top: STATUS_BAR_HEIGHT + 16,
          right: 16,
          zIndex: 50,
        }}
      >
        <Pressable
          onPress={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18, color: "white" }}>✕</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              flexDirection: "row",
              width: SCREEN_WIDTH * slides.length,
              flex: 1,
            },
            animatedStyle,
          ]}
        >
          {slides.map((slide, index) => (
            <SlideContainer
              key={slide.id}
              index={index}
              currentIndex={currentIndex}
            >
              {slide.component}
            </SlideContainer>
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Progress dots */}
      <View
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
        }}
      >
        <ProgressDots
          total={slides.length}
          currentIndex={currentIndex}
          onDotPress={handleDotPress}
        />
      </View>
    </View>
  );
}
