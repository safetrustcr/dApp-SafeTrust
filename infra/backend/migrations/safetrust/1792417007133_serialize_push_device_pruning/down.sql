DROP TRIGGER IF EXISTS push_devices_prune_owner ON public.push_devices;
DROP TRIGGER IF EXISTS push_devices_serialize_registration ON public.push_devices;
DROP FUNCTION IF EXISTS public.prune_push_devices_for_owner();
DROP FUNCTION IF EXISTS public.serialize_push_device_registration();
