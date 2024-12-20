import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

export default function ProtectedLayout() {
  const { colorScheme } = useColorScheme();

  return (
		<View style={{ flex: 1 }}>
			<Tabs
				screenOptions={{
					headerShown: false,
					tabBarStyle: {
						backgroundColor:
							colorScheme === "dark"
								? colors.dark.background
								: colors.light.background,
						borderTopWidth: 0,
						elevation: 0,
						height: 60,
						paddingBottom: 8,
						paddingTop: 8,
					},
					tabBarActiveTintColor:
						colorScheme === "dark"
							? colors.dark.primary
							: colors.light.primary,
					tabBarInactiveTintColor:
						colorScheme === "dark"
							? colors.dark.foreground
							: colors.light.foreground,
					tabBarShowLabel: true,
					tabBarLabelStyle: {
						fontSize: 12,
						fontWeight: '500',
					},
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						title: "Home",
						tabBarIcon: ({ color, size }) => (
							<Ionicons name="home" size={size} color={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="search"
					options={{
						title: "Search",
						tabBarIcon: ({ color, size }) => (
							<Ionicons name="search" size={size} color={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="settings"
					options={{
						title: "Settings",
						tabBarIcon: ({ color, size }) => (
							<Ionicons name="settings" size={size} color={color} />
						),
					}}
				/>
			</Tabs>
			{/* Logo overlay */}
			<View className="absolute left-0 right-0 bottom-[60] items-center">
					<Image
						source={
							colorScheme === "dark"
								? require("@/assets/icon-no-bg-white.png")
								: require("@/assets/icon-no-bg-blue.png")
						}
						className="w-6 h-[54]"
						contentFit="contain"
					/>
      </View>
    </View>
  );
}
