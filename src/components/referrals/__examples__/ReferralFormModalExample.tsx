import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../../ui/Button';
import { ReferralFormModal, ReferralFormData } from '../ReferralFormModal';

/**
 * Example usage of ReferralFormModal component
 * This demonstrates both general and group referral scenarios
 */
export const ReferralFormModalExample: React.FC = () => {
  const [generalModalVisible, setGeneralModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);

  const handleGeneralReferralSubmit = async (data: ReferralFormData) => {
    console.log('General referral submitted:', data);
    // In a real app, this would call the referral service
    // await referralService.createGeneralReferral(data);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const handleGroupReferralSubmit = async (data: ReferralFormData) => {
    console.log('Group referral submitted:', data);
    // In a real app, this would call the referral service
    // await referralService.createGroupReferral({ ...data, groupId: 'example-group-id' });

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <View style={styles.container}>
      <Button
        title="Open General Referral"
        onPress={() => setGeneralModalVisible(true)}
        style={styles.button}
      />

      <Button
        title="Open Group Referral"
        onPress={() => setGroupModalVisible(true)}
        style={styles.button}
      />

      {/* General Referral Modal */}
      <ReferralFormModal
        visible={generalModalVisible}
        onClose={() => setGeneralModalVisible(false)}
        onSubmit={handleGeneralReferralSubmit}
      />

      {/* Group Referral Modal */}
      <ReferralFormModal
        visible={groupModalVisible}
        onClose={() => setGroupModalVisible(false)}
        onSubmit={handleGroupReferralSubmit}
        groupId="example-group-id"
        groupName="Bible Study Group"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    marginBottom: 16,
    minWidth: 200,
  },
});
