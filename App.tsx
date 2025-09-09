// App.tsx - Main application entry point w
// ith auto-login
import * as ExpoIcons from "@expo/vector-icons";
console.log("DEBUG ExpoIcons:", ExpoIcons);

import * as ReactNative from "react-native";
console.log("DEBUG ReactNative:", Object.keys(ReactNative));

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import FeedScreen from './src/screens/FeedScreen';
import ELibraryScreen from './src/screens/ELibraryScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Type definitions
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  'E-Library': undefined;
  Map: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Main Tab Navigator
function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'circle'; // ✅ Safe typing

          switch (route.name) {
            case 'Feed':
              iconName = 'home';
              break;
            case 'E-Library':
              iconName = 'library-books';
              break;
            case 'Map':
              iconName = 'map';
              break;
            case 'Profile':
              iconName = 'person';
              break;
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="E-Library" component={ELibraryScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Loading Screen Component
function LoadingScreen(): React.JSX.Element {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4CAF50" />
    </View>
  );
}

// App Navigator with Auto-Login Logic
function AppNavigator(): React.JSX.Element {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated() ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Catch unhandled errors
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.log("🔥 Global JS Error:", error.message);
  console.log(error.stack);
});

// Main App Component
export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
