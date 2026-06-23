-- Allow users to delete their own milestones (needed for companion disconnect cascade)
CREATE POLICY "Users can delete their own milestones"
ON public.companion_milestones
FOR DELETE
USING (auth.uid() = user_id);

-- Clean up orphaned milestone data for 'solenne' and 'companion' member_ids
DELETE FROM public.companion_milestones WHERE member_id IN ('solenne', 'companion');

-- Also clean up orphaned connection records
DELETE FROM public.connections WHERE member_id IN ('solenne', 'companion');
