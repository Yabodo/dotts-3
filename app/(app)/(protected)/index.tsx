import { router } from "expo-router";
import { View, TextInput } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted, P } from "@/components/ui/typography";
import { useSupabase } from "@/context/supabase-provider";
import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { FormInput } from "@/components/ui/form";

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
     <Text>{text}</Text>
   </View>
 );
}

export function FriendsList() {
	const { fetchAvailableFriends, user } = useSupabase();
	const [friends, setFriends] = useState([]);
	useEffect(() => {
		const loadFriends = async () => {
			if (user) {
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
			<P>Friends List</P>
			{friends.length < 1 ? (
				<Text>No friends available</Text>
			) : (
				friends.map(friend => (
					<View key={friend.id}>
						<Text>{friend.name} @ {friend.location}</Text>
					</View>
				))
			)}
		</View>
	);
}

export default function Home() {
	return (
		<View className="flex-1 justify-center bg-background p-4 gap-y-4">
      <UserProfile />
			<RealTimeLocation />
			<FriendsList />
			<H1 className="text-center">Home</H1>
			<Muted className="text-center">
				You are now authenticated and this session will persist even after
				closing the app.
			</Muted>
			<Button
				className="w-full"
				variant="default"
				size="default"
				onPress={() => router.push("/(app)/modal")}
			>
				<Text>Open Modal</Text>
			</Button>
		</View>
	);
}
