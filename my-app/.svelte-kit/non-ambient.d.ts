
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/chat" | "/chat/heartbeat" | "/chat/loadMessages" | "/chat/markAsSeen" | "/chat/notifications" | "/chat/online-users" | "/chat/sendMessage" | "/chat/stream" | "/chat/upload" | "/forgot-password" | "/reset-password";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/chat": Record<string, never>;
			"/chat/heartbeat": Record<string, never>;
			"/chat/loadMessages": Record<string, never>;
			"/chat/markAsSeen": Record<string, never>;
			"/chat/notifications": Record<string, never>;
			"/chat/online-users": Record<string, never>;
			"/chat/sendMessage": Record<string, never>;
			"/chat/stream": Record<string, never>;
			"/chat/upload": Record<string, never>;
			"/forgot-password": Record<string, never>;
			"/reset-password": Record<string, never>
		};
		Pathname(): "/" | "/chat" | "/chat/" | "/chat/heartbeat" | "/chat/heartbeat/" | "/chat/loadMessages" | "/chat/loadMessages/" | "/chat/markAsSeen" | "/chat/markAsSeen/" | "/chat/notifications" | "/chat/notifications/" | "/chat/online-users" | "/chat/online-users/" | "/chat/sendMessage" | "/chat/sendMessage/" | "/chat/stream" | "/chat/stream/" | "/chat/upload" | "/chat/upload/" | "/forgot-password" | "/forgot-password/" | "/reset-password" | "/reset-password/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.svg" | string & {};
	}
}