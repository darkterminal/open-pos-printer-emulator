@component('layouts.app', ['title' => 'Login - Open POS Printer Emulator'])
<div class="panel" style="max-width:480px; margin: 40px auto;">
    <h1 style="margin-top:0;">Login</h1>
    <p class="muted">Use the seeded local admin account to access job history.</p>
    <form method="POST" action="{{ route('login.store') }}" class="grid" style="margin-top:20px;">
        @csrf
        <div>
            <label for="email">Email</label>
            <input id="email" name="email" type="email" value="{{ old('email', 'admin@example.com') }}" required autofocus>
        </div>
        <div>
            <label for="password">Password</label>
            <input id="password" name="password" type="password" value="password" required>
        </div>
        <div>
            <label><input type="checkbox" name="remember" value="1" style="width:auto; margin-right:8px;">Remember me</label>
        </div>
        @if ($errors->any())
            <div class="error">{{ $errors->first() }}</div>
        @endif
        <button class="btn" type="submit">Sign in</button>
    </form>
</div>
@endcomponent
