"use client"

import * as React from "react"
import * as TabsPrimitives from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitives.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitives.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitives.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitives.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitives.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitives.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
      "ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      "data-[state=inactive]:text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitives.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitives.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitives.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitives.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
