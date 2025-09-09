// src/screens/AuthScreen.tsx - Complete Auth Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'student' | 'lecturer';
  name: string;
  department: string;
  year: string;
  bio: string;
  phone: string;
}

export default function AuthScreen(): React.JSX.Element {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'student',
    name: '',
    department: '',
    year: '',
    bio: '',
    phone: '',
  });
  
  const { login, register, resendConfirmation } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): string | null => {
    if (!formData.email.trim()) {
      return 'Email is required';
    }
    
    if (!validateEmail(formData.email)) {
      return 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      return 'Password is required';
    }
    
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        return 'Passwords do not match';
      }
      
      if (!formData.name.trim()) {
        return 'Full name is required';
      }
      
      if (formData.name.trim().length < 2) {
        return 'Name must be at least 2 characters long';
      }
    }

    return null;
  };

  const handleSubmit = async (): Promise<void> => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Handle Login
        const result = await login(formData.email, formData.password);
        
        if (!result.success) {
          if (result.needsEmailConfirmation) {
            Alert.alert(
              'Email Confirmation Required',
              result.error || 'Please check your email and confirm your account.',
              [
                {
                  text: 'Resend Email',
                  onPress: async () => {
                    const resendResult = await resendConfirmation(formData.email);
                    Alert.alert(
                      resendResult.success ? 'Email Sent' : 'Error',
                      resendResult.message || resendResult.error || 'Please try again.'
                    );
                  }
                },
                {
                  text: 'OK',
                  style: 'cancel'
                }
              ]
            );
          } else {
            Alert.alert('Login Error', result.error || 'Login failed');
          }
        }
        // If successful, the auth state change will handle navigation
      } else {
        // Handle Registration
        const result = await register(formData.email, formData.password, {
          name: formData.name.trim(),
          user_type: formData.userType,
          department: formData.department.trim() || undefined,
          year: formData.userType === 'student' ? formData.year.trim() || undefined : undefined,
          bio: formData.bio.trim() || undefined,
          phone: formData.phone.trim() || undefined,
        });

        if (result.success) {
          if (result.needsEmailConfirmation) {
            Alert.alert(
              'Check Your Email!',
              result.message || 'We sent you a confirmation link. Please check your email and click the link to activate your account.',
              [
                {
                  text: 'Resend Email',
                  onPress: async () => {
                    const resendResult = await resendConfirmation(formData.email);
                    Alert.alert(
                      resendResult.success ? 'Email Sent' : 'Error',
                      resendResult.message || resendResult.error || 'Please try again.'
                    );
                  }
                },
                {
                  text: 'I\'ll Check My Email',
                  onPress: () => {
                    setIsLogin(true);
                    resetForm();
                  },
                  style: 'default'
                }
              ]
            );
          } else {
            Alert.alert(
              'Registration Successful!',
              result.message || 'You can now log in.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setIsLogin(true);
                    resetForm();
                  }
                }
              ]
            );
          }
        } else {
          Alert.alert('Registration Error', result.error || 'Registration failed - please try again');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert(
        'Error', 
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = (): void => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      userType: 'student',
      name: '',
      department: '',
      year: '',
      bio: '',
      phone: '',
    });
  };

  const toggleAuthMode = (): void => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Campus Connect</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome Back!' : 'Join Your Campus Community'}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                autoCapitalize='none'
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#4CAF50"
                />
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    autoCapitalize='none'
                    onChangeText={(text) => updateFormData('confirmPassword', text)}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                      size={24}
                      color="#4CAF50"
                    />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                  autoCapitalize="words"
                
                  editable={!loading}
                />

                <View style={[styles.pickerContainer, loading && styles.disabledInput]}>
                  <Text style={styles.pickerLabel}>User Type:</Text>
                  <Picker
                    selectedValue={formData.userType}
                    onValueChange={(value: 'student' | 'lecturer') => updateFormData('userType', value)}
                    style={styles.picker}
                    enabled={!loading}
                  >
                    <Picker.Item label="Student" value="student" />
                    <Picker.Item label="Lecturer" value="lecturer" />
                  </Picker>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Department (Optional)"
                  value={formData.department}
                  onChangeText={(text) => updateFormData('department', text)}
                  autoCapitalize="words"
                  editable={!loading}
                />

                {formData.userType === 'student' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Year (e.g., 1st Year, 2nd Year)"
                    value={formData.year}
                    onChangeText={(text) => updateFormData('year', text)}
                    editable={!loading}
                  />
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (Optional)"
                  value={formData.phone}
                  onChangeText={(text) => updateFormData('phone', text)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Bio (Optional)"
                  value={formData.bio}
                  onChangeText={(text) => updateFormData('bio', text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </>
            )}

            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Login' : 'Register'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchButton} 
              onPress={toggleAuthMode}
              disabled={loading}
            >
              <Text style={[styles.switchButtonText, loading && styles.disabledText]}>
                {isLogin 
                  ? "Don't have an account? Register" 
                  : 'Already have an account? Login'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeButton: {
    padding: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#333',
    paddingTop: 10,
    paddingBottom: 5,
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 50,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledInput: {
    backgroundColor: '#f9f9f9',
    borderColor: '#eee',
  },
  disabledText: {
    color: '#ccc',
  },
});