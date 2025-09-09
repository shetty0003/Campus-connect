// src/screens/MapScreen.tsx - Interactive Campus Map Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MapLocation } from '../types';

const { width, height } = Dimensions.get('window');

export default function MapScreen(): React.JSX.Element {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = (): void => {
    const mockLocations: MapLocation[] = [
      {
        id: '1',
        name: 'Main Library',
        description: 'Central library with study halls, computer lab, and extensive book collection. Open 24/7 during exam periods.',
        latitude: 9.0569,
        longitude: 7.4941,
        type: 'facility',
      },
      {
        id: '4',
        name: 'Sports Complex',
        description: 'Gymnasium, swimming pool, tennis courts, and sports facilities. Home to various athletic programs.',
        latitude: 9.0599,
        longitude: 7.4971,
        type: 'facility',
      },
      {
        id: '5',
        name: 'Medical Center',
        description: 'Campus health services and medical facilities. Emergency services available 24/7.',
        latitude: 9.0559,
        longitude: 7.4931,
        type: 'facility',
      },
      {
        id: '6',
        name: 'Science Laboratory Complex',
        description: 'State-of-the-art laboratories for Physics, Chemistry, and Biology departments.',
        latitude: 9.0609,
        longitude: 7.4981,
        type: 'building',
      },
    ];
    setLocations(mockLocations);
  };

  const getLocationIcon = (type: MapLocation['type']): string => {
    return type === 'building' ? 'apartment' : 'place';
  };

  const getLocationColor = (type: MapLocation['type']): string => {
    return type === 'building' ? '#2196F3' : '#FF9800';
  };

  // Simple map representation
  const renderSimpleMap = ():React.JSX.Element => (
    <View style={styles.mapContainer}>
      <View style={styles.mapContent}>
        <Text style={styles.mapTitle}>Campus Map</Text>
        <Text style={styles.mapSubtitle}>University of Abuja</Text>
        
        {/* Simulate map pins */}
        {locations.map((location, index) => (
          <TouchableOpacity
            key={location.id}
            style={[
              styles.mapPin,
              {
                top: 80 + (index % 3) * 70,
                left: 30 + (index % 4) * 80,
                backgroundColor: getLocationColor(location.type),
              },
              selectedLocation?.id === location.id && styles.selectedPin,
            ]}
            onPress={() => setSelectedLocation(location)}
          >
            <Icon 
              name={getLocationIcon(location.type)} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        ))}
        
        {/* Campus boundaries illustration */}
        <View style={styles.campusBoundary} />
      </View>
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
      {renderSimpleMap()}
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
    height: height * 0.4,
    backgroundColor: '#E8F5E8',
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapContent: {
    flex: 1,
    position: 'relative',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  mapPin: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedPin: {
    transform: [{ scale: 1.2 }],
    shadowOpacity: 0.4,
  },
  campusBoundary: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 1,
    opacity: 0.3,
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