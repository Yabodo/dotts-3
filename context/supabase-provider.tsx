import { Session, User } from "@supabase/supabase-js";
import { useRouter, useSegments, SplashScreen } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/config/supabase";

SplashScreen.preventAutoHideAsync();

type SupabaseContextProps = {
	user: User | null;
	profile: { 
		name: string; 
		is_ready_to_talk: boolean; 
		ready_until?: string | null;  // Add ready_until to profile type
		cafes?: { name: string } 
	} | null;
	session: Session | null;
	initialized?: boolean;
	signUp: (email: string, password: string) => Promise<void>;
	signInWithPassword: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	toggleAvailability: () => Promise<void>;
	updatePosition: (latitude: number, longitude: number) => Promise<void>;
	upsertUsername: (name: string) => Promise<boolean | undefined>;
	fetchAvailableFriends: (latitude: number, longitude: number) => Promise<Array<{
			id: string;
			name: string;
			profilePicture?: string;
			ready_until: string;
			cafe: {
					id: string;
					name: string;
					address: string;
			};
			distance: number;
	}>>;
	getProfile: () => Promise<void>;
	searchUsers: (query: string) => Promise<any[]>;
	addFriend: (friendId: string) => Promise<any>;
	acceptFriend: (friendId: string) => Promise<any>;
	removeFriend: (friendId: string) => Promise<any>;
	fullFriendsList: () => Promise<any[]>;
	incomingFriendRequests: () => Promise<any[]>;
	getNearestCafes: (latitude: number, longitude: number) => Promise<Array<{
		id: string;
		name: string;
		address: string;
		distance: number;
	}>>;
	setUserCafeStatus: (cafeId: string | null, duration: number, latitude?: number | null, longitude?: number | null) => Promise<any>;
};

type SupabaseProviderProps = {
	children: React.ReactNode;
};

export const SupabaseContext = createContext<SupabaseContextProps>({
	user: null,
	profile: null,
	session: null,
	initialized: false,
	signUp: async () => {},
	signInWithPassword: async () => {},
	signOut: async () => {},
	toggleAvailability: async () => {},
	updatePosition: async () => {},
	upsertUsername: async () => undefined,
	fetchAvailableFriends: async () => [],
	getProfile: async () => {},
	searchUsers: async () => [],
	addFriend: async () => {},
	acceptFriend: async () => {},
	removeFriend: async () => {},
	fullFriendsList: async () => [],
	incomingFriendRequests: async () => [],
	getNearestCafes: async () => [],
	setUserCafeStatus: async () => {},
});

export const useSupabase = () => useContext(SupabaseContext);

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
	const router = useRouter();
	const segments = useSegments();
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [initialized, setInitialized] = useState<boolean>(false);
	const [profile, setProfile] = useState<any>(null);

	const signUp = async (email: string, password: string) => {
		const { error } = await supabase.auth.signUp({
			email,
			password,
		});
		if (error) {
			throw error;
		}
	};

	const signInWithPassword = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) {
			throw error;
		}
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			throw error;
		}
	};


	const getNearestCafes = async (latitude: number, longitude: number) => {
		const { data, error } = await supabase.rpc('get_nearest_cafes', {
			latitude: latitude,
			longitude: longitude,
		});
		 if (error) {
			console.error('Error fetching nearest cafes:', error);
			return [];
		}
		return data;
	};



	const setUserCafeStatus = async (cafeId: string | null, duration: number, latitude?: number | null, longitude?: number | null) => {
    const { data, error } = await supabase.rpc('set_user_cafe_status', {
        cafe_id: cafeId,
        duration_hours: duration,
        latitude: latitude || null,
        longitude: longitude || null
    });
    if (error) {
        console.error('Error setting user cafe status:', error);
        return [];
    }
    // Update local profile after setting cafe status
    await getProfile();
    return data;
};

	const updatePosition = async (latitude: number, longitude: number) => {
		const { data, error } = await supabase.rpc('update_user_location', {
			latitude, 
			longitude
		});

		if (error) {
			console.error('Error updating user position:', error);
			return;
		}
	};

	const upsertUsername = async (name: string) => {
		if (user && profile) {
			try {
				const { data, error } = await supabase
					.from("users")
					.upsert([{ name }])
					.eq("id", user.id)
					.select();

				if (error) throw error;
				await getProfile()
				return true
			} catch (error) {
				console.error('Error upserting username:', error);
				return false
			}
		}
  };

	const toggleAvailability = async () => {
		if (user && profile) {
			profile.is_ready_to_talk = !profile.is_ready_to_talk
			const { error: updateError } = await supabase
				.from('users')
				.update({ is_ready_to_talk: profile.is_ready_to_talk })
				.eq('id', user.id);

			if (updateError) {
				console.error('Error updating status:', updateError);
			}
		}
	};

	const fetchAvailableFriends = async (latitude: number, longitude: number) => {
    if (user) {
        const { data, error } = await supabase.rpc('fetch_available_friends', {
            longitude,
            latitude
        });

        if (error) {
            console.error('Error fetching available friends:', error);
            return [];
        }

        return data.map((friend: { user_id: string; user_name: string; user_profile_picture: string; ready_until: string; cafe_id: string; cafe_name: string; cafe_address: string; distance: number }) => ({
            id: friend.user_id,
            name: friend.user_name,
            profilePicture: friend.user_profile_picture,
            ready_until: friend.ready_until,
            cafe: {
                id: friend.cafe_id,
                name: friend.cafe_name,
                address: friend.cafe_address
            },
            distance: friend.distance
        }));
    }
    return [];
};

	const getProfile = async () => {
		try {
			const { data, error } = await supabase
				.from("users")
				.select("id, name, is_ready_to_talk, location_id, ready_until, cafes(name)")
				.eq("id", user?.id)
				.single();

			if (error) throw error;
			setProfile(data);
		} catch (error) {
			if (!profile) {
				await createProfile(user?.id || "");
			} else {
				console.error("Error fetching profile by id", error);
			}
		}
	};

	const createProfile = async (name: string) => {
		try {
			const { data, error } = await supabase
				.from("users")
				.insert([{ name }])
				.select();
			if (error) throw error;
			return data;
		} catch (error) {
			console.error("Error creating profile", error);
		}
	};

	const searchUsers = async (query: string) => {
    const { data, error } = await supabase.rpc('search_users', { query });

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    return data;
  };

  const addFriend = async (friendId: string) => {
    const { data, error } = await supabase.rpc('add_friend', { friend: friendId });

    if (error) {
      console.error('Error adding friend:', error);
     return null;
   }
   return data;
 };
  const acceptFriend = async (friendId: string) => {
   const { data, error } = await supabase.rpc('accept_friend', { friend: friendId });
    if (error) {
     console.error('Error accepting friend request:', error);
     return null;
   }
   return data;
 };
  const removeFriend = async (friendId: string) => {
   const { data, error } = await supabase.rpc('remove_friend', { remove_friend_id: friendId });
    if (error) {
     console.error('Error removing friend:', error);
     return null;
   }
   return data;
 };

 const fullFriendsList = async () => {
  const { data, error } = await supabase.rpc('full_friends_list');

  if (error) {
    console.error('Error fetching friends list:', error);
    return [];
  }
  return data;
};

const incomingFriendRequests = async () => {
	const { data, error } = await supabase.rpc('incoming_friend_requests');
	 if (error) {
		console.error('Error fetching incoming friend requests:', error);
		return [];
	}
	return data;
};

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setUser(session ? session.user : null);
			setInitialized(true);
		});

		supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			setUser(session ? session.user : null);
		});
	}, []);

	useEffect(() => {
		if (!initialized) return;

		const inProtectedGroup = segments[1] === "(protected)";

		if (session && !inProtectedGroup) {
			router.replace("/(app)/(protected)");
		} else if (!session) {
			router.replace("/(app)/welcome");
		}

		setTimeout(() => {
			SplashScreen.hideAsync();
		}, 500);
	}, [initialized, session]);

	return (
		<SupabaseContext.Provider
			value={{
				user,
				profile,
				session,
				initialized,
				upsertUsername,
				signUp,
				signInWithPassword,
				signOut,
				toggleAvailability,
				getNearestCafes,
				updatePosition,
				fetchAvailableFriends,
				getProfile,
				searchUsers,
				addFriend,
				acceptFriend,
				removeFriend,
				fullFriendsList,
				incomingFriendRequests,
				setUserCafeStatus,
			}}
		>
			{children}
		</SupabaseContext.Provider>
	);
};
