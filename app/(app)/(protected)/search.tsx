import { useState, useEffect } from "react";
import { View, TextInput, ScrollView } from "react-native";
import { Button } from "@/components/ui/button";
import { H1, H4, Muted } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";
import { useSupabase } from "@/context/supabase-provider";

export default function SearchScreen() {
  const { searchUsers, addFriend, acceptFriend, removeFriend, user, fullFriendsList, incomingFriendRequests } = useSupabase();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
	const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

  useEffect(() => {
    loadFriends();
		loadIncomingRequests();
  }, []);

  const loadFriends = async () => {
    const friendsList = await fullFriendsList();
    setFriends(friendsList);
  };

  const loadIncomingRequests = async () => {
   const requests = await incomingFriendRequests();
   setIncomingRequests(requests);
 };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      // Filter out users who are already friends or have pending requests
      const filteredResults = results.filter((result: any) => {
        const existingFriend = friends.find(f => f.friend_id === result.id);
        return !existingFriend && result.id !== user?.id;
      });
      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      await addFriend(friendId);
      await loadFriends(); // Refresh friends list
      setSearchResults(prev => prev.filter(user => user.id !== friendId));
    } catch (error) {
      console.error("Error adding friend:", error);
    }
  };

  const handleAcceptFriend = async (friendId: string) => {
   try {
     await acceptFriend(friendId);
     await loadFriends(); // Refresh friends list
     await loadIncomingRequests(); // Refresh incoming requests
   } catch (error) {
     console.error("Error accepting friend request:", error);
   }
 };

 const handleRemoveFriend = async (friendId: string) => {
  try {
    await removeFriend(friendId);
    await loadFriends(); // Refresh friends list
  } catch (error) {
    console.error("Error removing friend:", error);
  }
};

  return (
   <ScrollView className="flex-1 bg-background p-4">
     <H1 className="mb-4">Find Friends</H1>
     
     {/* Search Box */}
     <View className="flex-row gap-2 mb-4">
       <TextInput
         className="flex-1 p-2 border border-gray-300 rounded"
         value={searchQuery}
         onChangeText={setSearchQuery}
         placeholder="Search users..."
         onSubmitEditing={handleSearch}
       />
       <Button 
         variant="default"
         onPress={handleSearch}
         disabled={isSearching || !searchQuery.trim()}
       >
         <Text>{isSearching ? "Searching..." : "Search"}</Text>
       </Button>
     </View>

{/* Search Results */}
{searchResults.length > 0 ? (
	<View className="mb-4">
		<H4 className="mb-2">Search Results</H4>
		{searchResults.map((result) => (
			<View key={result.id} className="flex-row items-center justify-between p-2 border border-gray-200 rounded mb-2">
				<Text className="font-bold">{result.name}</Text>
				<Button
					variant="default"
					size="sm"
					onPress={() => handleAddFriend(result.id)}
				>
					<Text>Add Friend</Text>
				</Button>
			</View>
		))}
	</View>
) : searchQuery ? (
	<View className="mb-4">
		<Muted className="text-center">No users found</Muted>
	</View>
) : null}
      {(incomingRequests.length > 0 || friends.filter(f => f.status === 'pending').length > 0) && (
        <View className="mb-4">
          <H4 className="mb-2">Friend Requests</H4>
          
          {/* Incoming Requests */}
          {incomingRequests.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2">Incoming Requests</Text>
              {incomingRequests.map((request) => (
                <View key={request.requester_id} className="flex-row items-center justify-between p-2 border border-gray-200 rounded mb-2">
                  <Text className="font-bold">{request.name}</Text>
                  <Button
                    variant="default"
                    size="sm"
                    onPress={() => handleAcceptFriend(request.requester_id)}
                  >
                    <Text>Accept</Text>
                  </Button>
                </View>
              ))}
            </View>
          )}
          
          {/* Outgoing Requests */}
          {friends.filter(f => f.status === 'pending').length > 0 && (
            <>
              <Text className="text-sm text-gray-500 mb-2">Outgoing Requests</Text>
              {friends.filter(f => f.status === 'pending').map((friend) => (
                <View key={friend.friend_id} className="flex-row items-center justify-between p-2 border border-gray-200 rounded mb-2">
                  <Text className="font-bold">{friend.name}</Text>
                  <Text className="text-gray-500">Pending</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
			 
     {/* Current Friends Section */}
		 <View className="mb-4">
      <H4 className="mb-2">My Friends</H4>
      {friends.filter(f => f.status === 'accepted').length === 0 ? (
        <View className="p-2 border border-gray-200 rounded">
          <Text className="text-gray-500">No friends yet</Text>
        </View>
      ) : (
        friends.filter(f => f.status === 'accepted' && f.friend_id !== user?.id).map((friend) => (
          <View key={friend.friend_id} className="flex-row items-center justify-between p-2 border border-gray-200 rounded mb-2">
            <Text className="font-bold">{friend.name}</Text>
						<Button
							variant="destructive"
							size="sm"
							onPress={() => handleRemoveFriend(friend.friend_id)}
						>
							<Text>Remove</Text>
						</Button>
          </View>
        ))
      )}
    </View>
   </ScrollView>
 );
}
