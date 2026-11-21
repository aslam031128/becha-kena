import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { BD_DIVISIONS, getThanasForDivision } from '@/utils/bd-data';
import { useLocation } from '@/hooks/useLocation';

export interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDivision?: string;
  selectedThana?: string;
  onSelectLocation: (loc: {
    division?: string;
    thana?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  selectedDivision,
  selectedThana,
  onSelectLocation,
}) => {
  const { colors, spacing, borderRadius } = useTheme();
  const [activeDivision, setActiveDivision] = useState<string | undefined>(selectedDivision);
  const [searchQuery, setSearchQuery] = useState('');
  const { requestLocationPermission, isLoading: isGpsLoading } = useLocation();

  const thanas = getThanasForDivision(activeDivision);
  const filteredThanas = thanas.filter((t) =>
    t.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleUseGps = async () => {
    const coords = await requestLocationPermission();
    if (coords) {
      onSelectLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      onClose();
    }
  };

  const handleSelectDivision = (divName: string) => {
    if (activeDivision === divName) {
      setActiveDivision(undefined);
    } else {
      setActiveDivision(divName);
    }
    setSearchQuery('');
  };

  const handleSelectThana = (thanaName: string) => {
    onSelectLocation({
      division: activeDivision,
      thana: thanaName,
    });
    onClose();
  };

  const handleSelectEntireDivision = () => {
    if (activeDivision) {
      onSelectLocation({
        division: activeDivision,
        thana: undefined,
      });
      onClose();
    }
  };

  const handleClearLocation = () => {
    onSelectLocation({
      division: undefined,
      thana: undefined,
      latitude: undefined,
      longitude: undefined,
    });
    setActiveDivision(undefined);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Select Location">
      <View style={styles.container}>
        {/* GPS Quick Action */}
        <TouchableOpacity
          onPress={handleUseGps}
          activeOpacity={0.7}
          style={[
            styles.gpsButton,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          {isGpsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="navigate-circle" size={20} color={colors.primary} />
          )}
          <Text style={[styles.gpsText, { color: colors.primary }]}>
            Use Current GPS Location
          </Text>
        </TouchableOpacity>

        {/* All Bangladesh Button */}
        <TouchableOpacity
          onPress={handleClearLocation}
          style={[
            styles.clearBtn,
            {
              borderColor: colors.border,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Ionicons name="earth" size={16} color={colors.textSecondary} />
          <Text style={[styles.clearText, { color: colors.textSecondary }]}>
            All Bangladesh (Reset Location)
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Step 1: Choose Division
        </Text>

        {/* Divisions Grid */}
        <View style={styles.divisionsWrap}>
          {BD_DIVISIONS.map((div) => {
            const isSelected = activeDivision?.toLowerCase() === div.name.toLowerCase();
            return (
              <TouchableOpacity
                key={div.id}
                onPress={() => handleSelectDivision(div.name)}
                style={[
                  styles.divisionChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.divisionText,
                    {
                      color: isSelected ? colors.surface : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {div.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Thana Selection if Division is Active */}
        {activeDivision && (
          <View style={styles.thanaSection}>
            <View style={styles.thanaHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                Step 2: Thana in {activeDivision}
              </Text>
              <TouchableOpacity onPress={handleSelectEntireDivision}>
                <Text style={[styles.allDivText, { color: colors.primary }]}>
                  All {activeDivision}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Thana Search Bar */}
            <View
              style={[
                styles.searchBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                placeholder="Search thana / area..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
            </View>

            {/* Thana List */}
            <ScrollView style={styles.thanaScroll} nestedScrollEnabled>
              {filteredThanas.map((t) => {
                const isSelected = selectedThana?.toLowerCase() === t.toLowerCase();
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => handleSelectThana(t)}
                    style={[
                      styles.thanaRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thanaText,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '400',
                        },
                      ]}
                    >
                      {t}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <Button
          title="Done"
          variant="secondary"
          onPress={onClose}
          style={{ marginTop: spacing.md }}
          fullWidth
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  gpsText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  clearText: {
    fontSize: 13,
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  divisionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  divisionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  divisionText: {
    fontSize: 13,
  },
  thanaSection: {
    marginTop: 6,
  },
  thanaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  allDivText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    padding: 0,
  },
  thanaScroll: {
    maxHeight: 180,
  },
  thanaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thanaText: {
    fontSize: 14,
  },
});
