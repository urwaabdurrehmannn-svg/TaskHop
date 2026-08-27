import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { SkillTag } from '../../components/common/SkillTag';
import { Avatar, AvatarSize } from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import * as profileService from '../../services/profile/profileService';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import type { RootStackParamList } from '../../navigation/types';
import type { Availability } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: 'available_now', label: 'Available now' },
  { value: 'available_soon', label: 'Free up soon' },
  { value: 'busy', label: 'Currently busy' },
];

export function EditProfileScreen({ navigation }: Props) {
  const { session, profile, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio === 'No bio yet.' ? '' : profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.university ?? '');
  const [availability, setAvailability] = useState<Availability>(profile?.availability ?? 'available_now');
  const [skillDraft, setSkillDraft] = useState('');
  const [skills, setSkills] = useState<string[]>(profile?.skills.map((s) => s.name) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function handlePickAvatar() {
    if (!session) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError('Photo library access is needed to choose a picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const uploadedUrl = await profileService.uploadAvatar(session.user.id, result.assets[0].uri);
      setAvatarUrl(uploadedUrl);
      await refreshProfile();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setAvatarUploading(false);
    }
  }

  function addSkill() {
    const trimmed = skillDraft.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillDraft('');
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setSkillDraft('');
  }

  function removeSkill(name: string) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }

  async function handleSave() {
    if (!session) return;
    if (!name.trim()) {
      setError('Your name is required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await profileService.updateProfile(session.user.id, {
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        availability,
      });
      await profileService.setUserSkills(session.user.id, skills);
      await refreshProfile();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Edit profile" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.avatarSection}>
          <Pressable
            onPress={handlePickAvatar}
            disabled={avatarUploading}
            style={styles.avatarPressable}
            accessibilityLabel="Change profile photo"
          >
            <Avatar
              name={name || profile?.name || ''}
              initials={profile?.initials ?? '?'}
              color={profile?.avatarColor ?? Colors.primary}
              imageUrl={avatarUrl}
              size={AvatarSize.xl}
            />
            <View style={styles.avatarBadge}>
              {avatarUploading ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <Ionicons name="camera" size={16} color={Colors.textInverse} />
              )}
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
          {avatarError && <Text style={styles.avatarErrorText}>{avatarError}</Text>}
        </View>

        <Input label="Name" placeholder="Your full name" value={name} onChangeText={setName} />
        <Input
          label="Bio"
          placeholder="A short line about what you do and what you're into."
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={280}
        />
        <Input
          label="University or location"
          placeholder="e.g. FAST-NUCES"
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Availability</Text>
        <View style={styles.availabilityRow}>
          {AVAILABILITY_OPTIONS.map((opt) => {
            const isActive = availability === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setAvailability(opt.value)}
                style={[styles.availabilityChip, isActive && styles.availabilityChipActive]}
              >
                <Text style={[styles.availabilityChipText, isActive && styles.availabilityChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, styles.sectionSpacing]}>Skills</Text>
        <Input
          placeholder="Type a skill and press add"
          value={skillDraft}
          onChangeText={setSkillDraft}
          onSubmitEditing={addSkill}
          returnKeyType="done"
          rightElement={
            <Pressable onPress={addSkill} style={styles.addSkillButton} hitSlop={8}>
              <Ionicons name="add" size={18} color={Colors.textInverse} />
            </Pressable>
          }
        />
        {skills.length > 0 && (
          <View style={styles.skillsWrap}>
            {skills.map((s) => (
              <Pressable key={s} onPress={() => removeSkill(s)} style={styles.removableSkill}>
                <SkillTag label={s} />
                <View style={styles.removeIcon}>
                  <Ionicons name="close" size={10} color={Colors.textInverse} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Save changes" onPress={handleSave} loading={saving} size="lg" icon="checkmark-circle" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarPressable: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  avatarHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  avatarErrorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.dangerDark,
    flex: 1,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  sectionSpacing: {
    marginTop: Spacing.sm,
  },
  availabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  availabilityChip: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  availabilityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  availabilityChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  availabilityChipTextActive: {
    color: Colors.textInverse,
  },
  addSkillButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -Spacing.xs,
  },
  removableSkill: {
    position: 'relative',
  },
  removeIcon: {
    position: 'absolute',
    top: -4,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});

export default EditProfileScreen;
