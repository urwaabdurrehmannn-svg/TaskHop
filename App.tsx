import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { TaskProvider } from './src/context/TaskContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationBanner } from './src/components/notifications/NotificationBanner';
import { navigationRef, flushPendingNotificationNavigation } from './src/navigation/navigationRef';
import { usePushNotifications } from './src/hooks/usePushNotifications';

// Needs to render inside AuthProvider/NotificationProvider (it depends on
// both), so it can't just be a hook call inside App() itself.
function PushNotificationsGate() {
  usePushNotifications();
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <TaskProvider>
            <NotificationProvider>
              <PushNotificationsGate />
              <NavigationContainer ref={navigationRef} onReady={flushPendingNotificationNavigation}>
                <RootNavigator />
              </NavigationContainer>
              <NotificationBanner />
            </NotificationProvider>
          </TaskProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
