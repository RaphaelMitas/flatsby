"use client";

import type { UserWrappedSummary } from "@flatsby/api";
import type { JSX } from "react";
import { useMemo, useState } from "react";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";

interface WrappedExperienceProps {
  summary: UserWrappedSummary;
}

interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  render: () => JSX.Element;
}

export function WrappedExperience({ summary }: WrappedExperienceProps) {
  const [index, setIndex] = useState(0);

  const slides: Slide[] = useMemo(
    () => [
      {
        id: "welcome",
        title: `Your ${summary.year} in shared shopping`,
        subtitle: summary.userName
          ? `Nice work this year, ${summary.userName}!`
          : "Nice work this year!",
        render: () => (
          <div className="flex flex-col items-center gap-8 py-4 text-center">
            <div className="text-primary animate-in zoom-in-50 text-8xl font-black tracking-tighter duration-700">
              {summary.year}
            </div>
            <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards max-w-md delay-300 duration-700">
              From {new Date(summary.from).toLocaleDateString()} to{" "}
              {new Date(summary.to).toLocaleDateString()}, you collaborated in
              groups, created shopping lists and got things done together.
            </p>
          </div>
        ),
      },
      {
        id: "engagement",
        title: "You kept showing up",
        subtitle: "Consistency is key.",
        render: () => (
          <div className="grid gap-3">
            <StatCard
              label="Sessions"
              value={summary.totalSessions}
              index={0}
            />
            <StatCard
              label="Active days"
              value={summary.activeDays}
              index={1}
            />
            <StatCard
              label="Longest streak"
              value={`${summary.longestStreak} days`}
              index={2}
            />
          </div>
        ),
      },
      {
        id: "groups",
        title: "Your crews",
        subtitle: "Shopping together hits different.",
        render: () => (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center">
              <div className="animate-in zoom-in-50 bg-primary/10 text-primary flex size-24 items-center justify-center rounded-full text-4xl font-bold duration-500">
                {summary.groupsJoined}
              </div>
            </div>
            <p className="text-muted-foreground animate-in fade-in fill-mode-backwards text-center text-sm delay-200 duration-500">
              groups joined
            </p>
            {summary.topGroupByActivity ? (
              <div className="border-primary/20 bg-primary/5 animate-in slide-in-from-bottom-4 fade-in fill-mode-backwards mt-4 rounded-2xl border p-5 delay-300 duration-500">
                <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Most active group
                </p>
                <p className="text-foreground mt-1 text-2xl font-bold">
                  {summary.topGroupByActivity.name}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {summary.topGroupByActivity.actions} item updates together
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground animate-in fade-in fill-mode-backwards text-center text-sm delay-300 duration-500">
                Join a group to start your shared shopping story.
              </p>
            )}
          </div>
        ),
      },
      {
        id: "lists",
        title: "Lists you lived in",
        subtitle: "Your shopping hubs.",
        render: () => (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center">
              <div className="animate-in zoom-in-50 bg-primary/10 text-primary flex size-24 items-center justify-center rounded-full text-4xl font-bold duration-500">
                {summary.listsTouched}
              </div>
            </div>
            <p className="text-muted-foreground animate-in fade-in fill-mode-backwards text-center text-sm delay-200 duration-500">
              lists touched
            </p>
            {summary.mostUsedList ? (
              <div className="border-primary/20 bg-primary/5 animate-in slide-in-from-bottom-4 fade-in fill-mode-backwards mt-4 rounded-2xl border p-5 delay-300 duration-500">
                <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Most used list
                </p>
                <p className="text-foreground mt-1 text-2xl font-bold">
                  {summary.mostUsedList.name}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {summary.mostUsedList.actions} actions on this list
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground animate-in fade-in fill-mode-backwards text-center text-sm delay-300 duration-500">
                Create a list to kick off your next run.
              </p>
            )}
          </div>
        ),
      },
      {
        id: "items",
        title: "You got things done",
        subtitle: "Tick, tick, done.",
        render: () => (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Created"
              value={summary.itemsCreated}
              index={0}
              className="col-span-1"
            />
            <StatCard
              label="Completed"
              value={summary.itemsCompleted}
              index={1}
              className="col-span-1"
            />
            <StatCard
              label="Completion rate"
              value={
                summary.completionRate != null
                  ? `${Math.round(summary.completionRate * 100)}%`
                  : "–"
              }
              index={2}
              className="col-span-2"
            />
            <StatCard
              label="Most productive day"
              value={
                summary.mostProductiveDay
                  ? new Date(summary.mostProductiveDay).toLocaleDateString()
                  : "–"
              }
              index={3}
              className="col-span-2"
            />
          </div>
        ),
      },
      {
        id: "categories",
        title: "Your shopping style",
        subtitle: "What you really cared about.",
        render: () => (
          <div className="flex flex-col gap-3">
            {summary.topCategories.length === 0 ? (
              <p className="text-muted-foreground animate-in fade-in text-center text-sm duration-500">
                Once you start adding items, we'll show your top categories
                here.
              </p>
            ) : (
              summary.topCategories.map((cat, idx) => (
                <div
                  key={cat.categoryId}
                  className="bg-muted/50 animate-in slide-in-from-left-4 fade-in fill-mode-backwards flex items-center justify-between rounded-xl px-4 py-3 duration-500"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{cat.categoryId}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {cat.count} item{cat.count === 1 ? "" : "s"}
                  </span>
                </div>
              ))
            )}
          </div>
        ),
      },
      {
        id: "summary",
        title: "Your Wrapped card",
        subtitle: "Perfect for a screenshot.",
        render: () => (
          <div className="flex max-h-[50vh] justify-center py-2">
            <div className="from-primary via-primary/80 to-primary/60 text-primary-foreground animate-in zoom-in-90 fade-in flex max-h-[calc(100vh-12rem)] w-full max-w-prose flex-col overflow-y-auto rounded-3xl bg-gradient-to-br p-6 shadow-xl duration-700 md:aspect-[9/16] md:overflow-hidden">
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-70">
                flatsby wrapped {summary.year}
              </p>
              <p className="mt-4 text-lg leading-tight font-bold">
                {summary.userName ?? "Your year in shared shopping"}
              </p>
              <div className="mt-6 flex-1 space-y-3">
                <SummaryItem
                  value={summary.itemsCompleted}
                  label="items completed"
                  delay={200}
                />
                <SummaryItem
                  value={summary.activeDays}
                  label="active days"
                  delay={400}
                />
                {summary.topCategories[0] && (
                  <div
                    className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
                    style={{ animationDelay: "600ms" }}
                  >
                    <p className="text-xs opacity-70">Top category</p>
                    <p className="font-semibold">
                      {summary.topCategories[0].categoryId}
                    </p>
                  </div>
                )}
                {summary.topGroupByActivity && (
                  <div
                    className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
                    style={{ animationDelay: "800ms" }}
                  >
                    <p className="text-xs opacity-70">Top group</p>
                    <p className="truncate font-semibold">
                      {summary.topGroupByActivity.name}
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-auto pt-8 text-[10px] opacity-60">flatsby.com</p>
            </div>
          </div>
        ),
      },
    ],
    [summary],
  );

  const current = slides[index];

  const goNext = () => setIndex((i) => Math.min(i + 1, slides.length - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="from-background via-muted to-background flex min-h-full flex-col items-center justify-center bg-linear-to-bl from-0% via-50% to-100% px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.2em] uppercase">
          <span>flatsby wrapped</span>
          <span>
            {index + 1} / {slides.length}
          </span>
        </div>

        <Card
          key={index}
          className="border-border/50 bg-card/90 animate-in fade-in slide-in-from-right-4 overflow-hidden shadow-lg backdrop-blur duration-500"
        >
          <CardHeader className="pb-2">
            <CardTitle className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
                {current?.id}
              </p>
              <h2 className="text-foreground text-2xl font-bold tracking-tight">
                {current?.title}
              </h2>
              {current?.subtitle && (
                <p className="text-muted-foreground text-sm font-normal">
                  {current.subtitle}
                </p>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-8">{current?.render()}</CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={index === 0}
              onClick={goPrev}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={index === slides.length - 1}
              onClick={goNext}
            >
              Next
            </Button>
          </div>

          <div className="flex gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string | null;
  index: number;
  className?: string;
}

function StatCard({ label, value, index, className = "" }: StatCardProps) {
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards bg-muted/50 hover:bg-primary/10 flex flex-col gap-1 rounded-xl p-4 duration-500 ${className}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="text-foreground text-2xl font-bold">{value ?? "–"}</span>
    </div>
  );
}

interface SummaryItemProps {
  value: number | string;
  label: string;
  delay: number;
}

function SummaryItem({ value, label, delay }: SummaryItemProps) {
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-2xl font-bold">{value}</span>
      <span className="ml-1.5 text-sm opacity-80">{label}</span>
    </div>
  );
}

export default WrappedExperience;
