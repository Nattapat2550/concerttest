import React from 'react';

const AboutPage = () => (
  <div className="max-w-4xl mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">About Us</h2>
    <div className="h-1 w-20 bg-blue-500 rounded mb-6"></div>
    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
      This is the about page of your React system. Here you can add information about your project, team, or mission.
    </p>
  </div>
);

export default AboutPage;