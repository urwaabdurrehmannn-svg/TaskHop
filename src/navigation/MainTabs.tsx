import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { PressScale } from '../constants/motion';
import { AnimatedPressable, usePressScale } from '../hooks/usePressScale';
import type { MainTabParamList } from './types';

import { HomeScreen } from '../screens/home/HomeScreen';
import { CreateTaskScreen } from '../screens/tasks/CreateTaskScreen';
import { MyTasksScreen } from '../screens/tasks/MyTasksScreen';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_META: Record<keyof MainTabParamList, { label: string; icon: IconName; iconActive: IconName; primary?: boolean }> = {
  Home: { label: 'Home', icon: 'home-outline', iconActive: 'home' },
  MyTasks: { label: 'My Tasks', icon: 'briefcase-outline', iconActive: 'briefcase' },
  Create: { label: 'Post', icon: 'add', iconActive: 'add', primary: true },
  Messages: { label: 'Messages', icon: 'chatbubble-ellipses-outline', iconActive: 'chatbubble-ellipses' },
  Profile: { label: 'Profile', icon: 'person-outline', iconActive: 'person' },
};

const ICON_CHIP_SIZE = 32;

function TabBarItem({ route, isFocused, meta, onPress }: any) {
  const { style: pressStyle, onPressIn, onPressOut } = usePressScale(PressScale.small);

  const iconColor = meta.primary ? Colors.textInverse : isFocused ? Colors.primary : Colors.textTertiary;
  const labelColor = meta.primary ? Colors.accent : isFocused ? Colors.primary : Colors.textTertiary;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={meta.label}
      style={[styles.tabItem, pressStyle]}
    >
      <View
        style={[
          styles.iconChip,
          meta.primary && styles.iconChipPrimary,
          !meta.primary && isFocused && styles.iconChipActive,
        ]}
      >
        <Ionicons name={isFocused ? meta.iconActive : meta.icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.tabLabel, { color: labelColor }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </AnimatedPressable>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      <View style={[styles.tabBar, Shadow.lg]}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name as keyof MainTabParamList];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return <TabBarItem key={route.key} route={route} isFocused={isFocused} meta={meta} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyTasks" component={MyTasksScreen} />
      <Tab.Screen name="Create" component={CreateTaskScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    height: 72,
    paddingHorizontal: Spacing.xxs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconChip: {
    width: ICON_CHIP_SIZE,
    height: ICON_CHIP_SIZE,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    backgroundColor: Colors.primaryLight,
  },
  iconChipPrimary: {
    backgroundColor: Colors.accent,
  },
  tabLabel: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
});

export default MainTabs;
