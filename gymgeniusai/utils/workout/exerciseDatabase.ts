// Comprehensive exercise database with equipment variants
export const EXERCISE_DATABASE = {
  // CHEST EXERCISES
  'Bench Press': {
    equipment: ['Barbell', 'Dumbbell', 'Machine', 'Smith Machine'],
    muscleGroup: 'Chest'
  },
  'Incline Press': {
    equipment: ['Barbell', 'Dumbbell', 'Machine', 'Smith Machine'],
    muscleGroup: 'Chest'
  },
  'Decline Press': {
    equipment: ['Barbell', 'Dumbbell', 'Machine', 'Smith Machine'],
    muscleGroup: 'Chest'
  },
  'Chest Flyes': {
    equipment: ['Dumbbell', 'Machine', 'Cable'],
    muscleGroup: 'Chest'
  },
  'Incline Flyes': {
    equipment: ['Dumbbell', 'Machine', 'Cable'],
    muscleGroup: 'Chest'
  },
  'Decline Flyes': {
    equipment: ['Dumbbell', 'Machine', 'Cable'],
    muscleGroup: 'Chest'
  },
  'Push-ups': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Chest'
  },
  'Dips': {
    equipment: ['Bodyweight', 'Assisted', 'Weighted'],
    muscleGroup: 'Chest'
  },
  'Pec Deck': {
    equipment: ['Machine'],
    muscleGroup: 'Chest'
  },
  'Cable Crossover': {
    equipment: ['Cable'],
    muscleGroup: 'Chest'
  },
  'Chest Press': {
    equipment: ['Machine'],
    muscleGroup: 'Chest'
  },

  // BACK EXERCISES
  'Deadlift': {
    equipment: ['Barbell', 'Dumbbell', 'Trap Bar', 'Smith Machine'],
    muscleGroup: 'Back'
  },
  'Romanian Deadlift': {
    equipment: ['Barbell', 'Dumbbell', 'Smith Machine'],
    muscleGroup: 'Back'
  },
  'Barbell Row': {
    equipment: ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Smith Machine'],
    muscleGroup: 'Back'
  },
  'Lat Pulldown': {
    equipment: ['Cable', 'Machine'],
    muscleGroup: 'Back'
  },
  'Pull-ups': {
    equipment: ['Bodyweight', 'Assisted', 'Weighted'],
    muscleGroup: 'Back'
  },
  'Chin-ups': {
    equipment: ['Bodyweight', 'Assisted', 'Weighted'],
    muscleGroup: 'Back'
  },
  'Seated Row': {
    equipment: ['Cable', 'Machine'],
    muscleGroup: 'Back'
  },
  'T-Bar Row': {
    equipment: ['Barbell', 'Machine'],
    muscleGroup: 'Back'
  },
  'Single-Arm Row': {
    equipment: ['Dumbbell', 'Cable'],
    muscleGroup: 'Back'
  },
  'Face Pulls': {
    equipment: ['Cable'],
    muscleGroup: 'Back'
  },
  'Reverse Flyes': {
    equipment: ['Dumbbell', 'Cable', 'Machine'],
    muscleGroup: 'Back'
  },
  'Hyperextensions': {
    equipment: ['Bodyweight', 'Machine'],
    muscleGroup: 'Back'
  },
  'Good Mornings': {
    equipment: ['Barbell', 'Dumbbell'],
    muscleGroup: 'Back'
  },
  'Shrugs': {
    equipment: ['Barbell', 'Dumbbell', 'Machine', 'Smith Machine'],
    muscleGroup: 'Back'
  },

  // SHOULDER EXERCISES
  'Shoulder Press': {
    equipment: ['Barbell', 'Dumbbell', 'Machine', 'Smith Machine'],
    muscleGroup: 'Shoulders'
  },
  'Overhead Press': {
    equipment: ['Barbell', 'Dumbbell', 'Smith Machine'],
    muscleGroup: 'Shoulders'
  },
  'Lateral Raises': {
    equipment: ['Dumbbell', 'Cable', 'Machine'],
    muscleGroup: 'Shoulders'
  },
  'Front Raises': {
    equipment: ['Dumbbell', 'Barbell', 'Cable', 'Plate'],
    muscleGroup: 'Shoulders'
  },
  'Rear Delt Flyes': {
    equipment: ['Dumbbell', 'Cable', 'Machine'],
    muscleGroup: 'Shoulders'
  },
  'Arnold Press': {
    equipment: ['Dumbbell'],
    muscleGroup: 'Shoulders'
  },
  'Upright Row': {
    equipment: ['Barbell', 'Dumbbell', 'Cable'],
    muscleGroup: 'Shoulders'
  },
  'Pike Push-ups': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Shoulders'
  },
  'Handstand Push-ups': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Shoulders'
  },

  // LEG EXERCISES
  'Squat': {
    equipment: ['Barbell', 'Dumbbell', 'Bodyweight', 'Machine', 'Smith Machine'],
    muscleGroup: 'Legs'
  },
  'Front Squat': {
    equipment: ['Barbell', 'Dumbbell', 'Smith Machine'],
    muscleGroup: 'Legs'
  },
  'Bulgarian Split Squats': {
    equipment: ['Bodyweight', 'Dumbbell'],
    muscleGroup: 'Legs'
  },
  'Lunges': {
    equipment: ['Bodyweight', 'Dumbbell', 'Barbell'],
    muscleGroup: 'Legs'
  },
  'Leg Press': {
    equipment: ['Machine'],
    muscleGroup: 'Legs'
  },
  'Leg Curl': {
    equipment: ['Machine', 'Dumbbell'],
    muscleGroup: 'Legs'
  },
  'Lying Hamstring Curl': {
    equipment: ['Machine', 'Dumbbell'],
    muscleGroup: 'Legs'
  },
  'Abductor': {
    equipment: ['Machine', 'Cable'],
    muscleGroup: 'Legs'
  },
  'Adductor': {
    equipment: ['Machine', 'Cable'],
    muscleGroup: 'Legs'
  },
  'Leg Extensions': {
    equipment: ['Machine'],
    muscleGroup: 'Legs'
  },
  'Calf Raise': {
    equipment: ['Bodyweight', 'Dumbbell', 'Machine', 'Barbell'],
    muscleGroup: 'Legs'
  },
  'Hip Thrusts': {
    equipment: ['Bodyweight', 'Barbell', 'Dumbbell'],
    muscleGroup: 'Legs'
  },
  'Stiff Leg Deadlift': {
    equipment: ['Barbell', 'Dumbbell'],
    muscleGroup: 'Legs'
  },
  'Step-ups': {
    equipment: ['Bodyweight', 'Dumbbell'],
    muscleGroup: 'Legs'
  },
  'Wall Sits': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Goblet Squat': {
    equipment: ['Dumbbell', 'Kettlebell'],
    muscleGroup: 'Legs'
  },

  // ARM EXERCISES
  'Bicep Curl': {
    equipment: ['Dumbbell', 'Barbell', 'Cable', 'Machine', 'Smith Machine'],
    muscleGroup: 'Arms'
  },
  'Hammer Curls': {
    equipment: ['Dumbbell', 'Cable'],
    muscleGroup: 'Arms'
  },
  'Triceps Pushdown': {
    equipment: ['Cable', 'Machine'],
    muscleGroup: 'Arms'
  },
  'Skull Crushers': {
    equipment: ['Barbell', 'Dumbbell'],
    muscleGroup: 'Arms'
  },
  'Close-Grip Bench Press': {
    equipment: ['Barbell', 'Dumbbell'],
    muscleGroup: 'Arms'
  },
  'Overhead Triceps Extension': {
    equipment: ['Dumbbell', 'Cable'],
    muscleGroup: 'Arms'
  },
  'Preacher Curls': {
    equipment: ['Barbell', 'Dumbbell', 'Machine'],
    muscleGroup: 'Arms'
  },
  'Concentration Curls': {
    equipment: ['Dumbbell'],
    muscleGroup: 'Arms'
  },
  'Diamond Push-ups': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Arms'
  },
  'Triceps Dips': {
    equipment: ['Bodyweight', 'Machine'],
    muscleGroup: 'Arms'
  },

  // CORE EXERCISES
  'Planks': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Russian Twists': {
    equipment: ['Bodyweight', 'Medicine Ball', 'Dumbbell'],
    muscleGroup: 'Core'
  },
  'Crunches': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Mountain Climbers': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Dead Bug': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Bird Dog': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Side Planks': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Leg Raises': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Bicycle Crunches': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Hanging Leg Raises': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Ab Wheel': {
    equipment: ['Ab Wheel'],
    muscleGroup: 'Core'
  },
  'Wood Chops': {
    equipment: ['Cable', 'Medicine Ball'],
    muscleGroup: 'Core'
  },

  // FUNCTIONAL EXERCISES
  'Burpees': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Kettlebell Swings': {
    equipment: ['Kettlebell'],
    muscleGroup: 'Full Body'
  },
  'Turkish Get-ups': {
    equipment: ['Kettlebell', 'Dumbbell'],
    muscleGroup: 'Full Body'
  },
  'Thrusters': {
    equipment: ['Barbell', 'Dumbbell'],
    muscleGroup: 'Full Body'
  },
  'Clean and Press': {
    equipment: ['Barbell', 'Dumbbell'],
    muscleGroup: 'Full Body'
  },
  'Battle Ropes': {
    equipment: ['Battle Ropes'],
    muscleGroup: 'Full Body'
  },
  'Farmer\'s Walk': {
    equipment: ['Dumbbell', 'Kettlebell'],
    muscleGroup: 'Full Body'
  },
  'Bear Crawl': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Crab Walk': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },

  // HIIT & CARDIO EXERCISES
  'Jump Squats': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'High Knees': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Plank Jacks': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Box Jumps': {
    equipment: ['Box', 'Platform'],
    muscleGroup: 'Legs'
  },
  'Tuck Jumps': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Broad Jumps': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Jumping Jacks': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Star Jumps': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Spiderman Climbs': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Butt Kickers': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Skater Jumps': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Lateral Jumps': {
    equipment: ['Bodyweight', 'Box'],
    muscleGroup: 'Legs'
  },
  'Sprint Intervals': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Jump Rope': {
    equipment: ['Jump Rope', 'Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Squat Jumps': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Lunge Jumps': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Plyometric Push-ups': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Chest'
  },
  'Clapping Push-ups': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Chest'
  },
  'Explosive Push-ups': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Chest'
  },
  'Sprint Burpees': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Jumping Lunges': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Single-Leg Burpees': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Squat Thrusts': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Frog Jumps': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Power Skips': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Fast Feet': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Sprint Shuffles': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Inchworms': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Full Body'
  },
  'Commandos': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'V-Ups': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Flutter Kicks': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Scissor Kicks': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Toe Touches': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Reverse Crunches': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Hollow Body Hold': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Core'
  },
  'Superman Hold': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Back'
  },
  'Single-Leg Deadlift': {
    equipment: ['Bodyweight', 'Dumbbell', 'Kettlebell'],
    muscleGroup: 'Legs'
  },
  'Jumping Split Squats': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Pistol Squats': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Cossack Squats': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Duck Walks': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Lateral Lunges': {
    equipment: ['Bodyweight', 'Dumbbell'],
    muscleGroup: 'Legs'
  },
  'Reverse Lunges': {
    equipment: ['Bodyweight', 'Dumbbell', 'Barbell'],
    muscleGroup: 'Legs'
  },
  'Walking Lunges': {
    equipment: ['Bodyweight', 'Dumbbell', 'Barbell'],
    muscleGroup: 'Legs'
  },
  'Jumping Calf Raises': {
    equipment: ['Bodyweight'],
    muscleGroup: 'Legs'
  },
  'Single-Leg Calf Raises': {
    equipment: ['Bodyweight', 'Dumbbell'],
    muscleGroup: 'Legs'
  }
};

// Cardio activities database
export const CARDIO_DATABASE = [
  'Running', 'Walking', 'Cycling', 'Swimming', 'Rowing', 'Elliptical',
  'Stair Climbing', 'Jump Rope', 'HIIT', 'Dancing', 'Hiking', 'Treadmill',
  'Stationary Bike', 'Cross Trainer', 'Boxing', 'Yoga', 'Pilates', 'Zumba',
  'StairMaster', 'Olympic Bike', 'Cardio Rower', 'Spin Bike', 'Recumbent Bike',
  'Upright Bike', 'Assault Bike', 'Air Bike', 'Concept2 Rower', 'Water Rowing',
  'Nordic Skiing', 'SkiErg', 'VersaClimber', 'Jacob\'s Ladder', 'Battle Ropes',
  'Kettlebell Swings', 'Burpees', 'Mountain Climbers', 'Jumping Jacks',
  'Step Aerobics', 'Kickboxing', 'Muay Thai', 'CrossFit', 'Tabata', 'Circuit Training'
];

export const STYLE_OPTIONS = [
  { key: 'slow', label: 'Slow & Controlled' },
  { key: 'normal', label: 'Normal' },
  { key: 'fast', label: 'Fast but Steady' },
];

