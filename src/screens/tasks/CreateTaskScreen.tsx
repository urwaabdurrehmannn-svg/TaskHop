import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { SkillTag } from '../../components/common/SkillTag';
import { Badge } from '../../components/common/Badge';
import { Colors, getCategoryColor } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useTasks } from '../../context/TaskContext';
import { CATEGORIES } from '../../data/categories';
import { validateTaskInput } from '../../services/tasks/taskService';
import * as taskUnderstanding from '../../services/ai/taskUnderstanding';
import type { TaskUnderstandingResult } from '../../services/ai/taskUnderstanding';
import type { MainTabParamList } from '../../navigation/types';
import type { CreateTaskInput, ExchangeType, TaskCategory } from '../../types';

const EXCHANGE_OPTIONS: { value: ExchangeType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'skill', label: 'Skill Exchange', icon: 'swap-horizontal' },
  { value: 'money', label: 'Money', icon: 'cash' },
];

type NavProp = BottomTabNavigationProp<MainTabParamList, 'Create'>;

const DEADLINE_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
];

function isoInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const emptyErrors: Record<string, string> = {};

export function CreateTaskScreen() {
  const navigation = useNavigation<NavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const { addTask } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [skillDraft, setSkillDraft] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [deadlineDays, setDeadlineDays] = useState<number | null>(null);
  const [exchangeType, setExchangeType] = useState<ExchangeType | null>(null);
  const [offeredSkill, setOfferedSkill] = useState('');
  const [offeredAmount, setOfferedAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>(emptyErrors);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [aiResult, setAiResult] = useState<TaskUnderstandingResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleAnalyzeWithAI() {
    if (!title.trim() || !description.trim()) {
      setAiError('Add a title and description first.');
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const result = await taskUnderstanding.analyzeTask({ title, description });
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Could not analyze this task.');
    } finally {
      setAiLoading(false);
    }
  }

  function applySuggestedCategory() {
    if (aiResult) setCategory(aiResult.suggestedCategory);
  }

  function applySuggestedSkill(skill: string) {
    setSkills((prev) => (prev.some((s) => s.toLowerCase() === skill.toLowerCase()) ? prev : [...prev, skill]));
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

  function resetForm() {
    setTitle('');
    setDescription('');
    setCategory(null);
    setSkillDraft('');
    setSkills([]);
    setDeadlineDays(null);
    setExchangeType(null);
    setOfferedSkill('');
    setOfferedAmount('');
    setErrors(emptyErrors);
    setAiResult(null);
    setAiError(null);
  }

  function selectExchangeType(type: ExchangeType) {
    setExchangeType(type);
    setOfferedSkill('');
    setOfferedAmount('');
  }

  async function handleSubmit() {
    const input: CreateTaskInput = {
      title,
      description,
      category: category as TaskCategory,
      skills,
      deadline: deadlineDays !== null ? isoInDays(deadlineDays) : '',
      exchangeType: exchangeType as ExchangeType,
      offeredSkill,
      offeredAmount,
    };

    const validationErrors = validateTaskInput(input);
    if (validationErrors.length > 0) {
      const map: Record<string, string> = {};
      validationErrors.forEach((e) => {
        map[e.field] = e.message;
      });
      setErrors(map);
      return;
    }

    setErrors(emptyErrors);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await addTask(input);
      resetForm();
      navigation.navigate('Home');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not post your task.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer
      scroll
      contentStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + Spacing.xl }]}
    >
      <ScreenHeader title="Post a task" subtitle="Tell us what you need — we'll help you find the right person." />

      {submitError && (
        <View style={styles.submitErrorBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.danger} />
          <Text style={styles.submitErrorText}>{submitError}</Text>
        </View>
      )}

      <Input
        label="Task title"
        placeholder="e.g. Edit my university event video"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        maxLength={80}
      />

      <Input
        label="Description"
        placeholder="Add context: what, when, and any details that help a match understand the job."
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        multiline
        maxLength={600}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((c) => {
          const isActive = category === c.name;
          const color = getCategoryColor(c.name);
          return (
            <Pressable key={c.name} onPress={() => setCategory(c.name)}>
              <Badge
                label={c.name}
                icon={c.icon}
                size="md"
                bg={isActive ? Colors.primary : color.bg}
                color={isActive ? Colors.textInverse : color.text}
              />
            </Pressable>
          );
        })}
      </View>
      {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

      <Text style={[styles.label, styles.sectionSpacing]}>Required skills</Text>
      <Input
        placeholder="Type a skill and press add"
        value={skillDraft}
        onChangeText={setSkillDraft}
        onSubmitEditing={addSkill}
        returnKeyType="done"
        error={errors.skills}
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

      <Text style={[styles.label, styles.sectionSpacing]}>Deadline</Text>
      <View style={styles.deadlineRow}>
        {DEADLINE_OPTIONS.map((opt) => {
          const isActive = deadlineDays === opt.days;
          return (
            <Pressable
              key={opt.label}
              onPress={() => setDeadlineDays(opt.days)}
              style={[styles.deadlineChip, isActive && styles.deadlineChipActive]}
            >
              <Text style={[styles.deadlineChipText, isActive && styles.deadlineChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errors.deadline && <Text style={styles.errorText}>{errors.deadline}</Text>}

      <Text style={[styles.label, styles.sectionSpacing]}>What are you offering in exchange?</Text>
      <View style={styles.exchangeRow}>
        {EXCHANGE_OPTIONS.map((opt) => {
          const isActive = exchangeType === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => selectExchangeType(opt.value)}
              style={[styles.exchangeChip, isActive && styles.exchangeChipActive]}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={isActive ? Colors.textInverse : Colors.textSecondary}
              />
              <Text style={[styles.exchangeChipText, isActive && styles.exchangeChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errors.exchangeType && <Text style={styles.errorText}>{errors.exchangeType}</Text>}

      {exchangeType === 'skill' && (
        <Input
          placeholder="e.g. I'll edit your video in exchange for you designing my poster."
          value={offeredSkill}
          onChangeText={setOfferedSkill}
          error={errors.offeredSkill}
          multiline
          maxLength={200}
        />
      )}

      {exchangeType === 'money' && (
        <Input
          label="Amount you're offering (Rs.)"
          placeholder="e.g. 2000"
          value={offeredAmount}
          onChangeText={setOfferedAmount}
          error={errors.offeredAmount}
          keyboardType="numeric"
        />
      )}

      <View style={styles.aiCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiIconWrap}>
            <Ionicons name="sparkles" size={18} color={Colors.primary} />
          </View>
          <View style={styles.aiTextWrap}>
            <Text style={styles.aiTitle}>TaskHop AI can help structure this</Text>
            <Text style={styles.aiSubtitle}>
              Get a suggested category, skills, and difficulty based on your description.
            </Text>
          </View>
        </View>

        <Button
          label="Analyze with AI"
          onPress={handleAnalyzeWithAI}
          loading={aiLoading}
          variant="secondary"
          size="sm"
          icon="sparkles"
          fullWidth={false}
          style={styles.aiButton}
        />

        {aiError && <Text style={styles.aiErrorText}>{aiError}</Text>}

        {aiResult && (
          <View style={styles.aiResults}>
            <Text style={styles.aiResultsLabel}>Suggested category</Text>
            <Pressable onPress={applySuggestedCategory} style={styles.aiSuggestionRow}>
              <Badge
                label={aiResult.suggestedCategory}
                bg={getCategoryColor(aiResult.suggestedCategory).bg}
                color={getCategoryColor(aiResult.suggestedCategory).text}
                size="sm"
              />
              <Text style={styles.aiApplyHint}>Tap to apply</Text>
            </Pressable>

            <Text style={[styles.aiResultsLabel, styles.sectionSpacing]}>Suggested skills</Text>
            <View style={styles.aiSkillsRow}>
              {aiResult.suggestedSkills.map((skill) => (
                <Pressable key={skill} onPress={() => applySuggestedSkill(skill)}>
                  <SkillTag label={skill} size="sm" />
                </Pressable>
              ))}
            </View>
            <Text style={styles.aiApplyHint}>Tap a skill to add it</Text>

            <Text style={[styles.aiResultsLabel, styles.sectionSpacing]}>Difficulty</Text>
            <Text style={styles.aiInfoText}>
              {aiResult.difficulty.charAt(0).toUpperCase() + aiResult.difficulty.slice(1)}
            </Text>

            {aiResult.requirements.length > 0 && (
              <>
                <Text style={[styles.aiResultsLabel, styles.sectionSpacing]}>What the helper should know</Text>
                {aiResult.requirements.map((req) => (
                  <Text key={req} style={styles.aiInfoText}>
                    • {req}
                  </Text>
                ))}
              </>
            )}

            {aiResult.suggestedDeadline && (
              <>
                <Text style={[styles.aiResultsLabel, styles.sectionSpacing]}>Possible deadline</Text>
                <Text style={styles.aiInfoText}>{aiResult.suggestedDeadline}</Text>
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.submitWrap}>
        <Button label="Post Task" onPress={handleSubmit} loading={submitting} icon="checkmark-circle" size="lg" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.xs,
  },
  submitErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  submitErrorText: {
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.md,
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
  deadlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  deadlineChip: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  deadlineChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deadlineChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  deadlineChipTextActive: {
    color: Colors.textInverse,
  },
  exchangeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  exchangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  exchangeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  exchangeChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  exchangeChipTextActive: {
    color: Colors.textInverse,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  aiCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  aiHeaderRow: {
    flexDirection: 'row',
  },
  aiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  aiTextWrap: {
    flex: 1,
  },
  aiTitle: {
    ...Typography.bodySemibold,
    color: Colors.primaryDark,
  },
  aiSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  aiButton: {
    marginTop: Spacing.sm,
  },
  aiErrorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  aiResults: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryMuted,
  },
  aiResultsLabel: {
    ...Typography.label,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
  },
  aiSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  aiApplyHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  aiSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  aiInfoText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  submitWrap: {
    marginTop: Spacing.xl,
  },
});

export default CreateTaskScreen;
