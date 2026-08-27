import { palette } from '../constants/colors';
import type { Skill, User } from '../types';

let skillCounter = 0;
function skill(name: string): Skill {
  skillCounter += 1;
  return { id: `skill-${skillCounter}`, name };
}

export const currentUser: User = {
  id: 'u-me',
  name: 'Urwa Abdurrehman',
  avatarColor: palette.indigo500,
  initials: 'UA',
  bio: 'CS student who loves shipping fast. Building TaskHop to make campus skill-sharing effortless.',
  university: 'FAST-NUCES',
  skills: [skill('React Native'), skill('Product Design'), skill('Pitching')],
  availability: 'available_now',
  stats: { tasksCompleted: 12, tasksPosted: 5, avgRating: 4.9, reviewCount: 12, responseTimeMins: 18 },
  completedTasks: [
    { id: 'ct-1', title: 'Landing page redesign', category: 'Design & Creative', rating: 5 },
    { id: 'ct-2', title: 'Pitch deck polish', category: 'Writing & Editing', rating: 5 },
  ],
  memberSince: 'Jan 2025',
};

export const mockUsers: User[] = [
  {
    id: 'u-1',
    name: 'Amna Raza',
    avatarColor: palette.coral500,
    initials: 'AR',
    bio: 'Video editor & motion designer. I make raw footage look like a Netflix trailer.',
    university: 'LUMS',
    skills: [skill('Video Editing'), skill('Premiere Pro'), skill('Motion Graphics'), skill('YouTube Editing')],
    availability: 'available_now',
    stats: { tasksCompleted: 34, tasksPosted: 2, avgRating: 4.95, reviewCount: 34, responseTimeMins: 12 },
    completedTasks: [
      { id: 'ct-3', title: 'University event highlight reel', category: 'Video & Photo', rating: 5 },
      { id: 'ct-4', title: 'Society recruitment video', category: 'Video & Photo', rating: 5 },
    ],
    memberSince: 'Sep 2024',
  },
  {
    id: 'u-2',
    name: 'Hassan Tariq',
    avatarColor: palette.teal500,
    initials: 'HT',
    bio: 'Full-stack dev, ships side projects on weekends. React Native + Firebase is my comfort zone.',
    university: 'FAST-NUCES',
    skills: [skill('React Native'), skill('Firebase'), skill('Node.js'), skill('API Integration')],
    availability: 'available_soon',
    stats: { tasksCompleted: 21, tasksPosted: 4, avgRating: 4.8, reviewCount: 21, responseTimeMins: 25 },
    completedTasks: [{ id: 'ct-5', title: 'Club membership app MVP', category: 'Tech & Dev', rating: 5 }],
    memberSince: 'Mar 2024',
  },
  {
    id: 'u-3',
    name: 'Zara Khan',
    avatarColor: palette.pink500,
    initials: 'ZK',
    bio: 'Graphic designer obsessed with clean typography and bold color. Brand kits are my love language.',
    university: 'IVS',
    skills: [skill('Graphic Design'), skill('Figma'), skill('Brand Identity'), skill('Illustration')],
    availability: 'available_now',
    stats: { tasksCompleted: 27, tasksPosted: 1, avgRating: 4.9, reviewCount: 27, responseTimeMins: 15 },
    completedTasks: [{ id: 'ct-6', title: 'Startup logo + brand kit', category: 'Design & Creative', rating: 5 }],
    memberSince: 'Nov 2024',
  },
  {
    id: 'u-4',
    name: 'Bilal Ahmed',
    avatarColor: palette.amber500,
    initials: 'BA',
    bio: 'Econ major, calculus tutor on the side. I make derivatives make sense.',
    university: 'LSE Pakistan',
    skills: [skill('Calculus'), skill('Statistics'), skill('Tutoring'), skill('Excel Modeling')],
    availability: 'busy',
    stats: { tasksCompleted: 18, tasksPosted: 0, avgRating: 4.7, reviewCount: 18, responseTimeMins: 40 },
    completedTasks: [{ id: 'ct-7', title: 'Midterm calc crash course', category: 'Tutoring & Academics', rating: 5 }],
    memberSince: 'Feb 2025',
  },
  {
    id: 'u-5',
    name: 'Sana Iqbal',
    avatarColor: palette.blue500,
    initials: 'SI',
    bio: 'Copywriter & editor. I turn rambly drafts into sharp, punchy copy.',
    university: 'LUMS',
    skills: [skill('Copywriting'), skill('Editing'), skill('Content Strategy')],
    availability: 'available_now',
    stats: { tasksCompleted: 15, tasksPosted: 3, avgRating: 4.85, reviewCount: 15, responseTimeMins: 20 },
    completedTasks: [{ id: 'ct-8', title: 'Newsletter rewrite', category: 'Writing & Editing', rating: 5 }],
    memberSince: 'Jun 2024',
  },
  {
    id: 'u-6',
    name: 'Omar Farooq',
    avatarColor: palette.indigo400,
    initials: 'OF',
    bio: 'Audio producer & podcast editor. I make things sound as good as they look.',
    university: 'NCA',
    skills: [skill('Audio Editing'), skill('Podcast Production'), skill('Sound Design')],
    availability: 'available_soon',
    stats: { tasksCompleted: 9, tasksPosted: 1, avgRating: 4.75, reviewCount: 9, responseTimeMins: 30 },
    completedTasks: [{ id: 'ct-9', title: 'Campus podcast season finale', category: 'Music & Audio', rating: 5 }],
    memberSince: 'Aug 2025',
  },
];

export const allUsers: User[] = [currentUser, ...mockUsers];
