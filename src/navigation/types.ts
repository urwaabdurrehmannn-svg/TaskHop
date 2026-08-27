import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  MyTasks: undefined;
  Create: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  TaskDetails: { taskId: string };
  Matches: { taskId?: string };
  DeletedTasks: undefined;
  EditProfile: undefined;
  BlockedUsers: undefined;
  UserProfile: { userId: string };
  Conversation: { taskInterestId: string };
  Notifications: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
