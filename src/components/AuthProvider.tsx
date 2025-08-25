import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { setUser, clearUser } from '../store/slices/authSlice';
import { AppDispatch } from '../store';
import { User } from '../types';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          console.log('Firebase auth state changed - user logged in:', firebaseUser.uid);
          
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user: User = {
              ...userData,
              uid: firebaseUser.uid, // Ensure uid is included
            } as User;
            
            console.log('Setting user in Redux:', user);
            dispatch(setUser(user));
          } else {
            console.error('User document not found in Firestore for UID:', firebaseUser.uid);
            dispatch(clearUser());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          dispatch(clearUser());
        }
      } else {
        console.log('Firebase auth state changed - user logged out');
        dispatch(clearUser());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
};

export default AuthProvider;