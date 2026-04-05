import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const LandingPage = () => {
  const { isAuthenticated, role } = useSelector((s: any) => s.auth);

  if (isAuthenticated) {
    return <Navigate to={role === 'admin' ? '/admin' : '/home'} replace />;
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-6">
        Welcome to MySite
      </h1>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10">
        This is a public landing page. Please register or login to continue and explore our features.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link 
          to="/register" 
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all text-center"
        >
          Register
        </Link>
        <Link 
          to="/login" 
          className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-xl shadow-sm transition-all text-center"
        >
          Login
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;