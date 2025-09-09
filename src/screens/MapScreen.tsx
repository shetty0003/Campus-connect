// src/screens/MapScreen.tsx - AUST Campus Real Map
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MapLocation } from '../types';

const { width, height } = Dimensions.get('window');

export default function MapScreen(): React.JSX.Element {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadAUSTLocations();
    getCurrentLocation();
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      getCurrentLocation();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentLocation = async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for real-time updates');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const loadAUSTLocations = (): void => {
    // AUST actual coordinates in Abuja, Nigeria
    const austBuildings: MapLocation[] = [
      {
        id: '1',
        name: 'Senate Building',
        description: 'Administrative headquarters housing the Vice-Chancellor office, Registrar, and other key administrative units.',
        latitude: 9.0765,
        longitude: 7.3986,
        type: 'building',
      },
      {
        id: '2',
        name: 'Academic Block A',
        description: 'Main lecture halls and classrooms for undergraduate programs. Houses Computer Science and Engineering departments.',
        latitude: 9.0775,
        longitude: 7.3996,
        type: 'building',
      },
      {
        id: '3',
        name: 'Academic Block B',
        description: 'Graduate studies building with seminar rooms, faculty offices, and research facilities.',
        latitude: 9.0785,
        longitude: 7.4006,
        type: 'building',
      },
      {
        id: '4',
        name: 'Central Library',
        description: 'Modern library with digital resources, study spaces, and research databases. Open 24/7 during exams.',
        latitude: 9.0755,
        longitude: 7.3976,
        type: 'facility',
      },
      {
        id: '5',
        name: 'Laboratory Complex',
        description: 'State-of-the-art laboratories for Physics, Chemistry, Biology, and Engineering research.',
        latitude: 9.0795,
        longitude: 7.4016,
        type: 'facility',
      },
      {
        id: '6',
        name: 'Student Center',
        description: 'Student activities hub with cafeteria, bookstore, and recreational facilities.',
        latitude: 9.0745,
        longitude: 7.3966,
        type: 'facility',
      },
      {
        id: '7',
        name: 'Male Hostel Block',
        description: 'Residential accommodation for male students with modern amenities and study areas.',
        latitude: 9.0805,
        longitude: 7.4026,
        type: 'residence',
      },
      {
        id: '8',
        name: 'Female Hostel Block',
        description: 'Residential accommodation for female students with security and recreational facilities.',
        latitude: 9.0815,
        longitude: 7.4036,
        type: 'residence',
      },
      {
        id: '9',
        name: 'Health Center',
        description: 'Campus medical facility providing healthcare services to students and staff.',
        latitude: 9.0735,
        longitude: 7.3956,
        type: 'facility',
      },
      {
        id: '10',
        name: 'Sports Complex',
        description: 'Multi-purpose sports facility with basketball court, football field, and fitness center.',
        latitude: 9.0825,
        longitude: 7.4046,
        type: 'facility',
      },
      {
        id: '11',
        name: 'ICT Center',
        description: 'Information and Communication Technology hub with computer labs and internet facilities.',
        latitude: 9.0765,
        longitude: 7.4026,
        type: 'facility',
      },
      {
        id: '12',
        name: 'Main Gate',
        description: 'Primary entrance to AUST campus with security checkpoint and visitor registration.',
        latitude: 9.0725,
        longitude: 7.3946,
        type: 'entrance',
      },
    ];
    setLocations(austBuildings);
  };

  const getLocationIcon = (type: MapLocation['type']): string => {
    switch (type) {
      case 'building': return 'apartment';
      case 'facility': return 'place';
      case 'residence': return 'home';
      case 'entrance': return 'login';
      default: return 'place';
    }
  };

  const getLocationColor = (type: MapLocation['type']): string => {
    switch (type) {
      case 'building': return '#2196F3';
      case 'facility': return '#4CAF50';
      case 'residence': return '#FF9800';
      case 'entrance': return '#9C27B0';
      default: return '#757575';
    }
  };

  const renderRealMap = (): React.JSX.Element => (
    <View style={styles.mapContainer}>
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.mapTitle}>AUST Campus Map</Text>
          <Text style={styles.mapSubtitle}>African University of Science & Technology</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <Text style={styles.lastUpdated}>
        Last updated: {lastUpdated.toLocaleTimeString()}
      </Text>
      
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: 9.0765,
          longitude: 7.3986,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {locations.map((location) => (
          <Marker
            key={location.id}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name}
            description={location.description}
            pinColor={getLocationColor(location.type)}
            onPress={() => setSelectedLocation(location)}
          />
        ))}
        
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="red"
          />
        )}
      </MapView>
      
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={() => {
          setLastUpdated(new Date());
          getCurrentLocation();
          Alert.alert('Map Updated', 'Location refreshed successfully!');
        }}
      >
        <Icon name="refresh" size={20} color="#4CAF50" />
      </TouchableOpacity>
    </View>
  );

  const renderLocationDetails = (): React.JSX.Element | null => {
    if (!selectedLocation) return null;

    return (
      <View style={styles.locationDetails}>
        <View style={styles.detailsHeader}>
          <View>
            <Text style={styles.locationName}>{selectedLocation.name}</Text>
            <Text style={styles.locationType}>
              {selectedLocation.type.charAt(0).toUpperCase() + selectedLocation.type.slice(1)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedLocation(null)}
          >
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        <Text style={styles.locationDescription}>
          {selectedLocation.description}
        </Text>
        <View style={styles.coordinatesContainer}>
          <Text style={styles.coordinatesText}>
            📍 {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
    );
  };

  const renderLocationsList = (): React.JSX.Element => (
    <ScrollView style={styles.locationsList}>
      <Text style={styles.listTitle}>Campus Locations</Text>
      {locations.map((location) => (
        <TouchableOpacity
          key={location.id}
          style={[
            styles.locationItem,
            selectedLocation?.id === location.id && styles.selectedLocationItem,
          ]}
          onPress={() => setSelectedLocation(location)}
        >
          <View style={styles.locationItemHeader}>
            <Icon
              name={getLocationIcon(location.type)}
              size={24}
              color={getLocationColor(location.type)}
            />
            <View style={styles.locationItemInfo}>
              <Text style={styles.locationItemName}>{location.name}</Text>
              <Text style={styles.locationItemType}>
                {location.type.charAt(0).toUpperCase() + location.type.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.locationItemDescription}>
            {location.description}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderRealMap()}
      {renderLocationDetails()}
      {renderLocationsList()}
    </View>
  );
}
const styles = StyleSheet.create({
  // Common styles
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Map Screen Styles
  mapContainer: {
    height: height * 0.5,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  map: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mapSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  liveText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },

  refreshButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  locationDetails: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationType: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: 4,
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  coordinatesContainer: {
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 6,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  locationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  locationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedLocationItem: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  locationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationItemInfo: {
    marginLeft: 12,
  },
  locationItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  locationItemType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  locationItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },

});