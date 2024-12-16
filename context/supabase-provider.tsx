import { Session, User } from "@supabase/supabase-js";
import { useRouter, useSegments, SplashScreen } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/config/supabase";

SplashScreen.preventAutoHideAsync();

type SupabaseContextProps = {
	user: User | null;
	profile: { name: string; is_ready_to_talk: boolean; cafes?: { name: string } } | null;
	session: Session | null;
	initialized?: boolean;
	signUp: (email: string, password: string) => Promise<void>;
	signInWithPassword: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	toggleAvailability: () => Promise<void>;
	updatePosition: (latitude: number, longitude: number) => Promise<void>;
	upsertUsername: (name: string) => Promise<boolean | undefined>;
	fetchAvailableFriends: () => Promise<any[]>;
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
	setUserCafeStatus: (cafeId: string, duration: number) => Promise<any>;
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
		
		console.log('Nearest cafes:', data);
		return data;
	};


	const setUserCafeStatus = async (cafeId: string, duration: number) => {
		const { data, error } = await supabase.rpc('set_user_cafe_status', {
			cafe_id: cafeId,
			duration_hours: duration
		});
		 if (error) {
			console.error('Error setting user cafe status:', error);
			return [];
		}
		return data;
	};

	
	

	const updatePosition = async (latitude: number, longitude: number) => {
		const { data, error } = await supabase.rpc('update_user_location', {
			latitude, 
			longitude
		});

		console.log(data);

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

	const fetchAvailableFriends = async () => {
		if (user) {
			const { data, error } = await supabase
					.from('friends')
					.select(`
							friend_id,
							user_id,
							friend: users!friends_friend_id_fkey(id, name, is_ready_to_talk, ready_until, location_id, cafes(name)),
							user: users!friends_user_id_fkey(id, name, is_ready_to_talk, ready_until, location_id, cafes(name))
					`)
					.eq('status', 'accepted')
					.or(`friend_id.eq.${user.id},user_id.eq.${user.id}`);

			if (error) {
					console.error('Error fetching friends:', error);
					return [];
			}
			console.log(data);
			return data.filter(friend => {
				const otherUser = friend.user_id === user.id ? friend.friend : friend.user;
				const now = new Date();
				const readyUntil = new Date(otherUser.ready_until);
				
				return otherUser.is_ready_to_talk && 
							 otherUser.location_id !== null && 
							 readyUntil > now;
			}).map(friend => {
				const otherUser = friend.user_id === user.id ? friend.friend : friend.user;
				return {
					id: otherUser.id,
					name: otherUser.name,
					location_id: otherUser.location_id,
					location: otherUser.cafes.name,
					is_ready_to_talk: otherUser.is_ready_to_talk,
					ready_until: new Date(otherUser.ready_until)
				};
			});
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
    console.log('Search results:', data);
    return data;
  };

  const addFriend = async (friendId: string) => {
    const { data, error } = await supabase.rpc('add_friend', { friend: friendId });

    if (error) {
      console.error('Error adding friend:', error);
     return null;
   }
   console.log('Friend request sent successfully:', data);
   return data;
 };
  const acceptFriend = async (friendId: string) => {
   const { data, error } = await supabase.rpc('accept_friend', { friend: friendId });
    if (error) {
     console.error('Error accepting friend request:', error);
     return null;
   }
   console.log('Friend request accepted successfully:', data);
   return data;
 };
  const removeFriend = async (friendId: string) => {
   const { data, error } = await supabase.rpc('remove_friend', { remove_friend_id: friendId });
    if (error) {
     console.error('Error removing friend:', error);
     return null;
   }
   console.log('Friend removed successfully:', data);
   return data;
 };

 const fullFriendsList = async () => {
  const { data, error } = await supabase.rpc('full_friends_list');

  if (error) {
    console.error('Error fetching friends list:', error);
    return [];
  }
  console.log('Full friends list:', data);
  return data;
};

const incomingFriendRequests = async () => {
	const { data, error } = await supabase.rpc('incoming_friend_requests');
	 if (error) {
		console.error('Error fetching incoming friend requests:', error);
		return [];
	}
	console.log('Incoming friend requests:', data);
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
