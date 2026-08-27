import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { LoadingIndicator } from '../components/common/LoadingIndicator';

import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { MainTabs } from './MainTabs';
import { TaskDetailsScreen } from '../screens/tasks/TaskDetailsScreen';
import { MatchesScreen } from '../screens/matches/MatchesScreen';
import { DeletedTasksScreen } from '../screens/tasks/DeletedTasksScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { BlockedUsersScreen } from '../screens/profile/BlockedUsersScreen';
import { UserProfileScreen } from '../screens/profile/UserProfileScreen';
import { ConversationScreen } from '../screens/messages/ConversationScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingIndicator fullscreen label="Loading TaskHop…" />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="TaskDetails"
            component={TaskDetailsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Matches"
            component={MatchesScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="DeletedTasks"
            component={DeletedTasksScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="BlockedUsers"
            component={BlockedUsersScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Conversation"
            component={ConversationScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default RootNavigator;
