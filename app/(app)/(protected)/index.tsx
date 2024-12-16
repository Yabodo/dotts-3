import { router } from "expo-router";
import { View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H4, Muted } from "@/components/ui/typography";
import { useSupabase } from "@/context/supabase-provider";
import { useEffect, useState } from "react";
import * as Location from "expo-location";

export function UserProfile() {
	const { getProfile, toggleAvailability, upsertUsername, user, profile, setUserCafeStatus } = useSupabase();
	const [isReady, setIsReady] = useState(profile?.is_ready_to_talk);
	const [isEditing, setIsEditing] = useState(false);
	const [newUsername, setNewUsername] = useState(profile?.name || "");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const loadProfile = async () => {
			if (user) {
				await getProfile();
			}
		};
		loadProfile();
	}, [user]);

	useEffect(() => {
		setIsReady(profile?.is_ready_to_talk);
		setNewUsername(profile?.name || "");
	}, [profile]);

	useEffect(() => {
		if (!profile?.ready_until) return;
		const checkAndClearCafe = async () => {
			const timeLeft = calculateTimeLeft();
			if (timeLeft === null || timeLeft <= 0) {
				await handleClearCafe();
			}
		};
		const intervalId = setInterval(checkAndClearCafe, 60000);
		checkAndClearCafe();
		return () => clearInterval(intervalId);
	}, [profile?.ready_until]);

	if (!profile) {
		return <Text>Loading profile...</Text>;
	}

	const handleToggleAvailability = async () => {
		setIsReady(!isReady);
		await toggleAvailability();
	};

	const handleUpdateUsername = async () => {
		if (newUsername.trim() === "") return;
		setIsSubmitting(true);
		try {
			const success = await upsertUsername(newUsername.trim());
			if (success) {
				setIsEditing(false);
			}
		} catch (error) {
			console.error("Error updating username:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const calculateTimeLeft = () => {
		if (!profile?.ready_until) return null;
		const now = new Date();
		const readyUntil = new Date(profile.ready_until);
		const timeLeft = readyUntil.getTime() - now.getTime();
		if (timeLeft <= 0) return null;
		return Math.floor(timeLeft / 60000);
	};

	const handleClearCafe = async () => {
		try {
			await setUserCafeStatus(null, 0);
			await getProfile();
		} catch (error) {
			console.error('Error clearing cafe selection:', error);
		}
	};

	return (
		<View>
			<Text>
				My name is 
				{isEditing ? (
					<View className="flex-1 flex-row items-center gap-2">
						<TextInput
							value={newUsername}
							onChangeText={setNewUsername}
							placeholder="Enter new username"
							autoFocus
							className="flex-1 p-2 border border-gray-300 rounded"
						/>
						<Button
							size="sm"
							variant="default"
							onPress={handleUpdateUsername}
							disabled={isSubmitting || newUsername.trim() === ""}
						>
							<Text>{isSubmitting ? "Saving..." : "Save"}</Text>
						</Button>
						<Button
							size="sm"
							variant="outline"
							onPress={() => {
								setIsEditing(false);
								setNewUsername(profile.name);
							}}
						>
							<Text>Cancel</Text>
						</Button>
					</View>
				) : (
					<Text className="font-bold" onPress={() => setIsEditing(true)}>
						{" "}{profile.name}{" "}
					</Text>
				)}
				and I'm{" "}
				<Text onPress={handleToggleAvailability}>
					<Text>{isReady ? "ready to talk!" : "busy."}</Text>
				</Text>
				{isReady ? (
					profile.cafes?.name ? (
						<Text onPress={handleClearCafe}>
							{` My friends can find me at ${profile.cafes.name} for the next ${calculateTimeLeft()} minutes!`}
						</Text>
					) : (
						<Text>
							{" I should find a place to go!"}
						</Text>
					)
				) : ""}
			</Text>
		</View>
	);
} 

export function RealTimeLocation() {
	const { updatePosition, user } = useSupabase();
	const [location, setLocation] = useState(null);
	const [errorMsg, setErrorMsg] = useState(null);

	useEffect(() => {
		(async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted" && user) {
				setErrorMsg("Permission to access location was denied");
				return;
			}
			Location.watchPositionAsync(
				{
					accuracy: Location.Accuracy.High,
					timeInterval: 60000,
					distanceInterval: 5,
				},
				(newLocation) => {
					setLocation(newLocation.coords);
				}
			);
		})();
	}, []);

	let text = "Waiting..";
	if (errorMsg) {
		text = errorMsg;
	} else if (location) {
		text = `Latitude: ${location.latitude}, Longitude: ${location.longitude}`;
	}

	return (
		<View>
			<Muted>
				{text}
			</Muted>
		</View>
	);
}

export function FriendsList() {
	const { fetchAvailableFriends, user } = useSupabase();
	const [friends, setFriends] = useState([]);
	const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);

	useEffect(() => {
		const watchLocation = async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				return;
			}
			Location.watchPositionAsync(
				{
					accuracy: Location.Accuracy.High,
					timeInterval: 5000,
					distanceInterval: 5
				},
				(newLocation) => {
					setLocation({
						latitude: newLocation.coords.latitude,
						longitude: newLocation.coords.longitude
					});
				}
			);
		};
		watchLocation();
	}, []);

	useEffect(() => {
		const loadFriends = async () => {
			if (user && location?.latitude && location?.longitude) {
				const friendsList = await fetchAvailableFriends(location.latitude, location.longitude);
				setFriends(friendsList);
			}
		};

		if (location?.latitude && location?.longitude) {
			loadFriends();
			const intervalId = setInterval(loadFriends, 5000);
			return () => clearInterval(intervalId);
		}
	}, [user, location]);

	const calculateTimeLeft = (readyUntil: string) => {
		if (!readyUntil) return null;
		const now = new Date();
		const endTime = new Date(readyUntil);
		const timeLeft = endTime.getTime() - now.getTime();
		if (timeLeft <= 0) return null;
		return Math.floor(timeLeft / 60000);
	};

	return (
		<View>
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				<H4 style={{ flex: 1 }}>Friends List</H4>
				<Button variant="icon" onPress={() => router.push("search")}>
					<Text>➕</Text>
				</Button>
			</View>
			{friends.length < 1 ? (
				<Text>No friends available</Text>
			) : (
				friends.map(friend => (
					<View key={friend.id} className="flex-row items-center justify-between p-2 border border-gray-200 rounded mb-2">
						<Text className="font-bold">{friend.name}</Text>
						<Muted>{friend.cafe.name} | {calculateTimeLeft(friend.ready_until)}min</Muted>
					</View>
				))
			)}
		</View>
	);
}

export function NearestCafes() {
	const { getNearestCafes, setUserCafeStatus, getProfile, profile } = useSupabase();
	const [cafes, setCafes] = useState<Array<{
		id: string;
		name: string;
		address: string;
		distance: number;
	}>>([]);
	const [loading, setLoading] = useState(false);
	const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
	const [selectedCafe, setSelectedCafe] = useState<string | null>(null);
	const [duration, setDuration] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const hasActiveCafeSession = () => {
		if (!profile?.ready_until || !profile?.location_id) return false;
		const now = new Date();
		const readyUntil = new Date(profile.ready_until);
		return readyUntil > now && profile.location_id !== null;
	};

	useEffect(() => {
		if (hasActiveCafeSession()) return;
		(async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				return;
			}
			Location.watchPositionAsync(
				{
					accuracy: Location.Accuracy.High,
					timeInterval: 60000,
					distanceInterval: 5
				},
				(newLocation) => {
					setLocation({
						latitude: newLocation.coords.latitude,
						longitude: newLocation.coords.longitude
					});
				}
			);
		})();
	}, [profile?.ready_until, profile?.location_id]);

	useEffect(() => {
		const fetchCafes = async () => {
			if (!location || hasActiveCafeSession()) return;
			setLoading(true);
			try {
				const nearestCafes = await getNearestCafes(location.latitude, location.longitude);
				setCafes(nearestCafes);
			} catch (error) {
				console.error('Error fetching nearest cafes:', error);
			} finally {
				setLoading(false);
			}
		};
		if (location && !selectedCafe) {
			fetchCafes();
		}
	}, [location, selectedCafe, profile?.ready_until, profile?.location_id]);

	if (hasActiveCafeSession()) {
		return null;
	}

	const handleStartSession = async (cafeId: string) => {
		setIsSubmitting(true);
		try {
			await setUserCafeStatus(
				cafeId, 
				duration,
				location?.latitude,
				location?.longitude
			);
			setSelectedCafe(cafeId);
			await getProfile();
		} catch (error) {
			console.error('Error starting session:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View>
			<H4>Nearby Cafes</H4>
			<View className="mt-2">
				{!location ? (
					<Muted>Waiting for location...</Muted>
				) : loading && cafes.length === 0 ? (
					<Muted>Loading locations...</Muted>
				) : cafes.length === 0 ? (
					<Muted>No public locations found nearby</Muted>
				) : (
					cafes.map(cafe => (
						<TouchableOpacity
							key={cafe.id}
							onPress={() => handleStartSession(cafe.id)}
							disabled={isSubmitting}
							className="flex-row items-center justify-between p-2 border border-gray-200 rounded mb-2"
						>
							<View>
								<Text className="font-bold">{cafe.name}</Text>
								<Muted>{cafe.address}</Muted>
							</View>
							<Muted>{Math.round(cafe.distance)}m</Muted>
						</TouchableOpacity>
					))
				)}
			</View>
		</View>
	);
}

export default function Home() {
  const [isLocationGranted, setIsLocationGranted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [location, setLocation] = useState(null);
  const { profile, user, getProfile } = useSupabase();

  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        console.log('Location permission status:', status);
        setIsLocationGranted(status === "granted");
        
        if (status === "granted") {
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 60000,
              distanceInterval: 5
            },
            (newLocation) => {
              console.log('New location received:', newLocation);
              setLocation(newLocation.coords);
            }
          );
          return () => subscription.remove();
        }
      } catch (error) {
        console.error('Error checking location permission:', error);
      }
    };
    checkLocationPermission();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        console.log('Loading profile for user:', user.id);
        await getProfile();
      }
    };
    loadProfile();
  }, [user]);

  const isAppReady = () => {
    console.log('Checking app ready:', { profile, location, user });
    if (!user) return false;
    if (!profile) return false;
    
    const hasActiveCafeSession = () => {
      if (!profile.ready_until) return false;
      const now = new Date();
      const readyUntil = new Date(profile.ready_until);
      return readyUntil > now;
    };
    return location !== null || hasActiveCafeSession();
  };

  useEffect(() => {
    if (isAppReady()) {
      console.log('App is ready, ending initial load');
      setIsInitialLoad(false);
    }
  }, [location, profile, user]);

  if (isInitialLoad) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-4">Loading Dotts...</Text>
      </View>
    );
  }

  if (!isLocationGranted) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-center mb-2">Location Permission Required</Text>
        <Muted className="text-center">
          Dotts needs location access to show you nearby locations and friends.
        </Muted>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-background p-4 gap-y-4">
      <UserProfile />
      <RealTimeLocation />
      <NearestCafes />
      <FriendsList />
    </View>
  );
}
