import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
// Catch unhandled errors
// import * as ExpoIcons from "@expo/vector-icons";
// console.log("DEBUG ExpoIcons:", ExpoIcons);

// import * as ReactNative from "react-native";
// console.log("DEBUG ReactNative:", Object.keys(ReactNative));

// ErrorUtils.setGlobalHandler((error, isFatal) => {
//   console.log("🔥 Global JS Error:", error.message);
//   console.log(error.stack);
// });
