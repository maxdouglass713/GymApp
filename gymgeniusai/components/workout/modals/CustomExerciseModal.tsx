import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { BrandColors, ComponentStyles, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { EXERCISE_DATABASE } from '@/utils/workout/exerciseDatabase';
import type {
  CustomExerciseInput,
  CustomExerciseTrackingStyle,
} from '@/stores/workoutStore';

interface CustomExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (exercise: CustomExerciseInput) => void;
}

type WizardStep = 'basics' | 'muscle' | 'equipment' | 'details' | 'review';

const getInitialFormState = () => ({
  name: '',
  type: 'strength' as 'strength' | 'cardio',
  muscleGroup: '',
  equipment: [] as string[],
  isBodyweight: false,
  trackingStyle: 'weight_reps' as CustomExerciseTrackingStyle,
  cardioMetrics: {
    duration: true,
    distance: false,
  },
  description: '',
});

export const CustomExerciseModal: React.FC<CustomExerciseModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState<WizardStep>('basics');
  const [form, setForm] = useState(getInitialFormState());
  const [error, setError] = useState<string | null>(null);

  const muscleGroupOptions = useMemo(() => {
    const groups = new Set<string>();
    Object.values(EXERCISE_DATABASE).forEach((exercise: any) => {
      if (exercise?.muscleGroup) {
        groups.add(exercise.muscleGroup);
      }
    });
    const sorted = Array.from(groups).sort((a, b) => a.localeCompare(b));
    if (!sorted.includes('Full Body')) {
      sorted.push('Full Body');
    }
    return sorted;
  }, []);

  const equipmentOptions = useMemo(() => {
    const equipment = new Set<string>();
    Object.values(EXERCISE_DATABASE).forEach((exercise: any) => {
      if (Array.isArray(exercise?.equipment)) {
        exercise.equipment.forEach((item: string) => equipment.add(item));
      }
    });
    equipment.add('Bodyweight');
    equipment.add('Resistance Band');
    equipment.add('Other');
    return Array.from(equipment).sort((a, b) => a.localeCompare(b));
  }, []);

  const steps: WizardStep[] = ['basics', 'muscle', 'equipment', 'details', 'review'];
  const activeStepIndex = steps.indexOf(step);
  const totalSteps = steps.length;

  const resetState = () => {
    setForm(getInitialFormState());
    setStep('basics');
    setError(null);
  };

  const closeModal = () => {
    resetState();
    onClose();
  };

  const handleNext = () => {
    setError(null);

    switch (step) {
      case 'basics': {
        if (!form.name.trim()) {
          setError('Please give your exercise a name.');
          return;
        }
        break;
      }
      case 'muscle': {
        if (!form.muscleGroup) {
          setError('Select the primary muscle group this exercise targets.');
          return;
        }
        break;
      }
      case 'equipment': {
        if (form.equipment.length === 0) {
          setError('Pick at least one piece of equipment (include Bodyweight if applicable).');
          return;
        }
        break;
      }
      case 'details': {
        if (form.type === 'cardio') {
          const { duration, distance } = form.cardioMetrics;
          if (!duration && !distance) {
            setError('Track at least one metric for cardio exercises.');
            return;
          }
        }
        break;
      }
      default:
        break;
    }

    const nextIndex = Math.min(activeStepIndex + 1, totalSteps - 1);
    setStep(steps[nextIndex]);
  };

  const handleBack = () => {
    setError(null);
    const previousIndex = Math.max(activeStepIndex - 1, 0);
    setStep(steps[previousIndex]);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.muscleGroup || form.equipment.length === 0) {
      setError('Complete all required fields before creating your exercise.');
      return;
    }

    if (form.type === 'cardio') {
      const { duration, distance } = form.cardioMetrics;
      if (!duration && !distance) {
        setError('Track at least one metric for cardio exercises.');
        return;
      }
    }

    const payload: CustomExerciseInput = {
      name: form.name.trim(),
      type: form.type,
      muscleGroup: form.muscleGroup,
      equipment: form.equipment,
      isBodyweight: form.type === 'strength' ? form.isBodyweight : false,
      trackingStyle:
        form.type === 'strength'
          ? form.trackingStyle
          : form.cardioMetrics.distance && form.cardioMetrics.duration
            ? 'time_distance'
            : form.cardioMetrics.distance
              ? 'distance'
              : 'time',
      cardioMetrics: form.type === 'cardio' ? form.cardioMetrics : undefined,
      description: form.description?.trim() || undefined,
    };

    onSubmit(payload);
    closeModal();
  };

  const renderStepContent = () => {
    switch (step) {
      case 'basics':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: BrandColors.text }]}>Name & Type</Text>
            <Text style={[styles.stepDescription, { color: BrandColors.textSecondary }]}>
              Give your exercise a descriptive name and tell us how you plan to use it.
            </Text>

            <Text style={[styles.inputLabel, { color: BrandColors.text }]}>Exercise name</Text>
            <TextInput
              style={[styles.textInput, { color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="e.g., Single-Leg Landmine RDL"
              placeholderTextColor={BrandColors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: BrandColors.text, marginTop: Spacing.md }]}>
              Exercise type
            </Text>
            <View style={styles.toggleRow}>
              {(['strength', 'cardio'] as const).map((typeOption) => (
                <TouchableOpacity
                  key={typeOption}
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor:
                        form.type === typeOption ? BrandColors.accent : BrandColors.gray800,
                      borderColor: BrandColors.textSecondary,
                    },
                  ]}
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      type: typeOption,
                      trackingStyle:
                        typeOption === 'strength' ? prev.trackingStyle : 'time',
                      cardioMetrics:
                        typeOption === 'cardio'
                          ? prev.cardioMetrics
                          : { duration: true, distance: false },
                      isBodyweight: typeOption === 'cardio' ? false : prev.isBodyweight,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      { color: form.type === typeOption ? '#000' : BrandColors.text },
                    ]}
                  >
                    {typeOption === 'strength' ? 'Strength' : 'Cardio'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'muscle':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: BrandColors.text }]}>Primary muscle group</Text>
            <Text style={[styles.stepDescription, { color: BrandColors.textSecondary }]}>
              Choose the main area this exercise targets. We use it for search and recommendations.
            </Text>
            <View style={styles.chipGrid}>
              {muscleGroupOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        form.muscleGroup === option ? BrandColors.accent : BrandColors.gray800,
                      borderColor: BrandColors.textSecondary,
                    },
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, muscleGroup: option }))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: form.muscleGroup === option ? '#000' : BrandColors.text },
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'equipment':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: BrandColors.text }]}>Equipment</Text>
            <Text style={[styles.stepDescription, { color: BrandColors.textSecondary }]}>
              Select every setup that applies. We'll show these as options when someone adds the exercise.
            </Text>
            <ScrollView style={styles.equipmentList}>
              {equipmentOptions.map((option) => {
                const isSelected = form.equipment.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.equipmentRow,
                      {
                        borderColor: BrandColors.textSecondary,
                        backgroundColor: isSelected ? BrandColors.accent : BrandColors.gray800,
                      },
                    ]}
                    onPress={() =>
                      setForm((prev) => {
                        const nextOptions = isSelected
                          ? prev.equipment.filter((item) => item !== option)
                          : [...prev.equipment, option];
                        return { ...prev, equipment: nextOptions };
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.equipmentText,
                        { color: isSelected ? '#000' : BrandColors.text },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {form.type === 'strength' && (
              <View style={[styles.switchRow, { borderColor: BrandColors.textSecondary }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: BrandColors.text }]}>
                    This is primarily a bodyweight movement
                  </Text>
                  <Text style={[styles.switchDescription, { color: BrandColors.textSecondary }]}>
                    We'll prefill weight using the athlete's bodyweight when they log sets.
                  </Text>
                </View>
                <Switch
                  value={form.isBodyweight}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      isBodyweight: value,
                      equipment: value
                        ? Array.from(new Set([...prev.equipment, 'Bodyweight']))
                        : prev.equipment,
                    }))
                  }
                  thumbColor={form.isBodyweight ? '#000' : BrandColors.gray300}
                  trackColor={{ true: BrandColors.accent, false: BrandColors.gray700 }}
                />
              </View>
            )}
          </View>
        );

      case 'details':
        if (form.type === 'strength') {
          return (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: BrandColors.text }]}>How do you track progress?</Text>
              <Text style={[styles.stepDescription, { color: BrandColors.textSecondary }]}>
                Pick the style that best matches how you'll log sets for this exercise.
              </Text>

              <View style={styles.chipColumn}>
                {[
                  { key: 'weight_reps', label: 'Weight × Reps', description: 'Track both weight and reps per set.' },
                  { key: 'reps_only', label: 'Reps Only', description: 'Useful for holds or calisthenics.' },
                ].map(({ key, label, description }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.detailOption,
                      {
                        borderColor: BrandColors.textSecondary,
                        backgroundColor:
                          form.trackingStyle === key ? BrandColors.accent : BrandColors.gray800,
                      },
                    ]}
                    onPress={() =>
                      setForm((prev) => ({
                        ...prev,
                        trackingStyle: key as CustomExerciseTrackingStyle,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.detailOptionTitle,
                        { color: form.trackingStyle === key ? '#000' : BrandColors.text },
                      ]}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[styles.detailOptionDescription, { color: BrandColors.textSecondary }]}
                    >
                      {description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: BrandColors.text, marginTop: Spacing.md }]}>
                Coaching notes (optional)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: BrandColors.text,
                    borderColor: BrandColors.textSecondary,
                    backgroundColor: BrandColors.gray800,
                  },
                ]}
                value={form.description}
                onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
                placeholder="Anything athletes should remember when performing this movement?"
                placeholderTextColor={BrandColors.textSecondary}
                multiline
              />
            </View>
          );
        }

        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: BrandColors.text }]}>Cardio tracking metrics</Text>
            <Text style={[styles.stepDescription, { color: BrandColors.textSecondary }]}>
              Choose the data points you'll capture every time this cardio exercise is logged.
            </Text>

            <View style={styles.switchColumn}>
              {[
                {
                  key: 'duration',
                  label: 'Duration',
                  description: 'Record how long the session lasts (minutes).',
                },
                {
                  key: 'distance',
                  label: 'Distance',
                  description: 'Track mileage or distance covered.',
                },
              ].map(({ key, label, description }) => (
                <View
                  key={key}
                  style={[styles.switchRow, { borderColor: BrandColors.textSecondary }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabel, { color: BrandColors.text }]}>{label}</Text>
                    <Text style={[styles.switchDescription, { color: BrandColors.textSecondary }]}>
                      {description}
                    </Text>
                  </View>
                  <Switch
                    value={(form.cardioMetrics as any)[key]}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        cardioMetrics: {
                          ...prev.cardioMetrics,
                          [key]: value,
                        },
                      }))
                    }
                    thumbColor={(form.cardioMetrics as any)[key] ? '#000' : BrandColors.gray300}
                    trackColor={{ true: BrandColors.accent, false: BrandColors.gray700 }}
                  />
                </View>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: BrandColors.text, marginTop: Spacing.md }]}>
              Coaching notes (optional)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  color: BrandColors.text,
                  borderColor: BrandColors.textSecondary,
                  backgroundColor: BrandColors.gray800,
                },
              ]}
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholder="Describe pacing, zones, or technique cues."
              placeholderTextColor={BrandColors.textSecondary}
              multiline
            />
          </View>
        );

      case 'review':
      default:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: BrandColors.text }]}>Review details</Text>
            <Text style={[styles.stepDescription, { color: BrandColors.textSecondary }]}>
              Make sure everything looks right before saving to your library.
            </Text>

            <View style={[styles.summaryCard, { borderColor: BrandColors.textSecondary }]}>
              <SummaryRow label="Exercise name" value={form.name.trim() || '—'} />
              <SummaryRow
                label="Type"
                value={form.type === 'strength' ? 'Strength' : 'Cardio'}
              />
              <SummaryRow label="Primary muscle" value={form.muscleGroup || '—'} />
              <SummaryRow label="Equipment" value={form.equipment.join(', ') || '—'} />
              {form.type === 'strength' && (
                <>
                  <SummaryRow
                    label="Bodyweight movement"
                    value={form.isBodyweight ? 'Yes' : 'No'}
                  />
                  <SummaryRow
                    label="Tracking style"
                    value={
                      form.trackingStyle === 'weight_reps'
                        ? 'Weight × Reps'
                        : form.trackingStyle === 'reps_only'
                          ? 'Reps only'
                          : 'Custom metric'
                    }
                  />
                </>
              )}
              {form.type === 'cardio' && (
                <SummaryRow
                  label="Metrics"
                  value={[
                    form.cardioMetrics.duration ? 'Duration' : null,
                    form.cardioMetrics.distance ? 'Distance' : null,
                  ]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                />
              )}
              {form.description ? (
                <View style={styles.summaryNotes}>
                  <Text style={[styles.summaryLabel, { color: BrandColors.textSecondary }]}>
                    Coaching notes
                  </Text>
                  <Text style={[styles.summaryValue, { color: BrandColors.text }]}>
                    {form.description.trim()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: BrandColors.background }]}>
        <View style={[styles.header, { borderColor: BrandColors.textSecondary }]}>
          <TouchableOpacity onPress={closeModal}>
            <Text style={[styles.closeText, { color: BrandColors.accent }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: BrandColors.text }]}>Create Exercise</Text>
            <Text style={[styles.headerSubtitle, { color: BrandColors.textSecondary }]}>
              {activeStepIndex + 1} of {totalSteps}
            </Text>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: BrandColors.gray800,
              },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: BrandColors.accent,
                  width: `${((activeStepIndex + 1) / totalSteps) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.contentScroll}>
          {renderStepContent()}
        </ScrollView>

        {error ? (
          <Text style={[styles.errorText, { color: BrandColors.accent }]}>{error}</Text>
        ) : null}

        <View style={[styles.footer, { borderColor: BrandColors.textSecondary }]}>
          <TouchableOpacity
            style={[
              styles.footerButton,
              {
                borderColor: BrandColors.textSecondary,
                backgroundColor: BrandColors.gray800,
                opacity: activeStepIndex === 0 ? 0.4 : 1,
              },
            ]}
            onPress={handleBack}
            disabled={activeStepIndex === 0}
          >
            <Text style={[styles.footerButtonText, { color: BrandColors.text }]}>Back</Text>
          </TouchableOpacity>

          {step === 'review' ? (
            <TouchableOpacity
              style={[ComponentStyles.button.primary, styles.footerButton]}
              onPress={handleSubmit}
            >
              <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>
                Save Exercise
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[ComponentStyles.button.primary, styles.footerButton]}
              onPress={handleNext}
            >
              <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerRightPlaceholder: {
    width: 60,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
  },
  closeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressBarContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 999,
  },
  contentScroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  stepDescription: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSize.md,
    minHeight: 120,
    fontFamily: Typography.fontFamily,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chipColumn: {
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  equipmentList: {
    maxHeight: 260,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    borderColor: 'transparent',
  },
  equipmentRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  equipmentText: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  switchColumn: {
    gap: Spacing.sm,
  },
  switchLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  switchDescription: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  detailOption: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  detailOptionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  detailOptionDescription: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    flexShrink: 0,
    width: 140,
  },
  summaryValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    flex: 1,
    textAlign: 'right',
  },
  summaryNotes: {
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  footerButtonText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
  },
  errorText: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
});

interface SummaryRowProps {
  label: string;
  value: string;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, { color: BrandColors.textSecondary }]}>{label}</Text>
    <Text style={[styles.summaryValue, { color: BrandColors.text }]}>{value}</Text>
  </View>
);


