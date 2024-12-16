import { router } from "expo-router";
import { View, TextInput, TouchableOpacity } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H4, Muted } from "@/components/ui/typography";
import { useSupabase } from "@/context/supabase-provider";
import { useEffect, useState } from "react";
import * as Location from "expo-location";

export function UserProfile() {
	const { getProfile, toggleAvailability, upsertUsername, user, profile } = useSupabase();
	// Add local state to immediately update UI
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
	 // Update local state when profile changes
	useEffect(() => {
		setIsReady(profile?.is_ready_to_talk);
		setNewUsername(profile?.name || "");
	}, [profile]);
	 if (!profile) {
		return <Text>Loading profile...</Text>;
	}
	 // Modify the click handler to update local state immediately
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
	 return (
		<View>
			<Text>
				My name is 
				{isEditing ? (
         <View className="flex-1 flex-row items-center gap-2">
				 <TextInput  // Changed from FormInput to TextInput
					 value={newUsername}
					 onChangeText={setNewUsername}
					 placeholder="Enter new username"
					 autoFocus
					 className="flex-1 p-2 border border-gray-300 rounded"  // Added some basic styling
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
				{isReady ? (profile.cafes?.name ? ` My friends can find me at ${profile.cafes.name}!` : " I should find a place to go!") : ""}
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
         timeInterval: 60000, // Update every 2 seconds
         distanceInterval: 5, // Update every 5 meters
       },
       (newLocation) => {
				 updatePosition(newLocation.coords.latitude, newLocation.coords.longitude)
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
	useEffect(() => {
		const loadFriends = async () => {
			if (user && location) {
				const friendsList = await fetchAvailableFriends();
				setFriends(friendsList);
			}
		};
		loadFriends();
		const intervalId = setInterval(loadFriends, 5000); // Update every 5 seconds
		return () => clearInterval(intervalId); // Cleanup on unmount
	}, [user]);
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
						<Muted>{friend.location}</Muted>
					</View>
				))
			)}
		</View>
	);
}

export function NearestCafes() {
  const { getNearestCafes, setUserCafeStatus } = useSupabase();
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
  // Share location state with other components
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const fetchCafes = async () => {
      if (!location) return;
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
    if (location) {
      fetchCafes();
    }
  }, [location]);

  const handleStartSession = async (cafeId: string) => {
    const { setUserCafeStatus, user } = useSupabase();
    setIsSubmitting(true);
    try {
      await setUserCafeStatus(cafeId, duration);
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
          <Muted>Loading cafes...</Muted>
        ) : cafes.length === 0 ? (
          <Muted>No cafes found nearby</Muted>
        ) : (
          cafes.map(cafe => (
            <TouchableOpacity key={cafe.id} onPress={() => handleStartSession(cafe.id)} className="flex-row items-center justify-between p-2 border border-gray-200 rounded mb-2">
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
	return (
		<View className="flex-1 justify-center bg-background p-4 gap-y-4">
      <UserProfile />
			<RealTimeLocation />
      <NearestCafes />
			<FriendsList />
		</View>
	);
}
