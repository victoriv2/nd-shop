/**
 * Keeps a Supabase admin session active for cloud sync (app_state, realtime).
 * Bypass PIN login calls this so changes still reach other browsers.
 */
(function () {
    function formatPhoneForAuth(id) {
        let phone = (id || '').trim();
        if (!phone) return null;
        if (phone.startsWith('0')) phone = '+234' + phone.substring(1);
        else if (!phone.startsWith('+')) phone = '+234' + phone;
        return phone;
    }

    function buildAuthParams(loginId, password) {
        const id = (loginId || '').trim();
        if (!id || !password) return null;
        if (id.includes('@')) {
            return { email: id, password };
        }
        const phone = formatPhoneForAuth(id);
        return phone ? { phone, password } : null;
    }

    async function verifyIsAdmin(userId) {
        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .single();
        return !error && profile && profile.is_admin === true;
    }

    async function signInAndVerify(authParams) {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword(authParams);
        if (error) throw error;
        const isAdmin = await verifyIsAdmin(data.user.id);
        if (!isAdmin) {
            await window.supabaseClient.auth.signOut();
            throw new Error('not_admin');
        }
        return data;
    }

    function cacheCloudCredentials(loginId, password, loginType) {
        if (!loginId || !password) return;
        localStorage.setItem('nd_admin_cloud_login', loginId.trim());
        localStorage.setItem('nd_admin_cloud_password', password);
        localStorage.setItem('nd_admin_cloud_login_type', loginType || (loginId.includes('@') ? 'email' : 'phone'));
    }

    window.establishAdminCloudSession = async function (options = {}) {
        if (!window.supabaseClient) {
            return { ok: false, reason: 'no_client' };
        }

        try {
            const { data: sessionData } = await window.supabaseClient.auth.getSession();
            if (sessionData.session) {
                const isAdmin = await verifyIsAdmin(sessionData.session.user.id);
                if (isAdmin) {
                    if (window.realtimeSync && typeof window.realtimeSync.initialFetch === 'function') {
                        await window.realtimeSync.initialFetch();
                    }
                    return { ok: true, source: 'existing_session' };
                }
                await window.supabaseClient.auth.signOut();
            }

            const { data: refreshed, error: refreshError } = await window.supabaseClient.auth.refreshSession();
            if (!refreshError && refreshed.session) {
                const isAdmin = await verifyIsAdmin(refreshed.session.user.id);
                if (isAdmin) {
                    if (window.realtimeSync && typeof window.realtimeSync.initialFetch === 'function') {
                        await window.realtimeSync.initialFetch();
                    }
                    return { ok: true, source: 'refreshed_session' };
                }
                await window.supabaseClient.auth.signOut();
            }
        } catch (e) {
            console.warn('[AdminCloud] Session check failed:', e);
        }

        const tryOrder = [];

        if (options.loginId && options.password) {
            tryOrder.push({ loginId: options.loginId, password: options.password, label: 'bypass_form' });
        }

        const storedLogin = localStorage.getItem('nd_admin_cloud_login');
        const storedPassword = localStorage.getItem('nd_admin_cloud_password');
        if (storedLogin && storedPassword) {
            tryOrder.push({ loginId: storedLogin, password: storedPassword, label: 'cached' });
        }

        const fallbackId = localStorage.getItem('nd_admin_id');
        if (fallbackId && options.password && !tryOrder.some(t => t.loginId === fallbackId)) {
            tryOrder.push({ loginId: fallbackId, password: options.password, label: 'admin_id' });
        }

        for (const attempt of tryOrder) {
            const authParams = buildAuthParams(attempt.loginId, attempt.password);
            if (!authParams) continue;
            try {
                await signInAndVerify(authParams);
                cacheCloudCredentials(attempt.loginId, attempt.password);
                console.log('[AdminCloud] Cloud session established via', attempt.label);
                if (window.realtimeSync && typeof window.realtimeSync.initialFetch === 'function') {
                    await window.realtimeSync.initialFetch();
                }
                if (window.NdCloudSync && typeof window.NdCloudSync.pushAllLocalStateToCloud === 'function') {
                    await window.NdCloudSync.pushAllLocalStateToCloud();
                }
                return { ok: true, source: attempt.label };
            } catch (e) {
                console.warn('[AdminCloud] Sign-in failed for', attempt.label, e.message || e);
            }
        }

        return { ok: false, reason: 'no_valid_credentials' };
    };

    window.cacheAdminCloudCredentials = cacheCloudCredentials;
})();
