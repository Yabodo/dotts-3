import React from "react";
import { Text, View } from "react-native";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import tw from "@/lib/tailwind";
import { useSupabase } from "@/context/useSupabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const FormSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
	password: z
		.string()
		.min(8, "Please enter at least 8 characters.")
		.max(64, "Please enter fewer than 64 characters."),
});

export default function Login() {
	const { signInWithPassword } = useSupabase();
	const router = useRouter();

	const {
		control,
		handleSubmit,
		trigger,
		formState: { errors, isSubmitting },
	} = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
	});

	async function onSubmit(data: z.infer<typeof FormSchema>) {
		try {
			await signInWithPassword(data.email, data.password);
		} catch (error) {
			console.error(error);
		}
	}

	return (
		<SafeAreaView
			style={tw`flex-1 items-center bg-background dark:bg-dark-background p-4`}
		>
			<View style={tw`w-full gap-y-4`}>
				<Controller
					control={control}
					name="email"
					render={({ field: { onChange, onBlur, value } }) => (
						<Input
							label="Email"
							placeholder="Email"
							value={value}
							onChangeText={onChange}
							onBlur={() => {
								trigger("email");
								onBlur();
							}}
							errors={errors.email?.message}
							autoCapitalize="none"
							autoComplete="email"
							autoCorrect={false}
							keyboardType="email-address"
						/>
					)}
				/>
				<Controller
					control={control}
					name="password"
					render={({ field: { onChange, onBlur, value } }) => (
						<Input
							label="Password"
							placeholder="Password"
							value={value}
							onChangeText={onChange}
							onBlur={() => {
								trigger("password");
								onBlur();
							}}
							errors={errors.password?.message}
							autoCapitalize="none"
							autoComplete="off"
							autoCorrect={false}
							secureTextEntry
						/>
					)}
				/>
			</View>
			<View style={tw`w-full gap-y-4 absolute bottom-[50px]`}>
				<Button
					label="Login"
					onPress={handleSubmit(onSubmit)}
					isLoading={isSubmitting}
				/>
				<Text
					style={tw`muted text-center`}
					onPress={() => {
						router.back();
					}}
				>
					Don't have an account?
				</Text>
			</View>
		</SafeAreaView>
	);
}